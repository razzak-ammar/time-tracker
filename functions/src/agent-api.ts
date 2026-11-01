import { FieldPath, Firestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { Request } from "firebase-functions/v2/https";
import { Response } from "express";
import { randomUUID } from "node:crypto";

class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
  }
}

function invalid(message: string): never {
  throw new ApiError(400, "invalid_argument", message);
}

function id(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) {
    invalid("IDs must contain 1–128 letters, numbers, underscores, or hyphens.");
  }
  return value;
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid("Expected a JSON object.");
  return value as Record<string, unknown>;
}

function allowedFields(data: Record<string, unknown>, fields: string[]): void {
  const unknown = Object.keys(data).filter((key) => !fields.includes(key));
  if (unknown.length) invalid(`Unknown fields: ${unknown.join(", ")}.`);
}

function date(value: unknown, name: string): Timestamp {
  if (typeof value !== "string" ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(value) ||
    !Number.isFinite(Date.parse(value))) {
    invalid(`${name} must be an ISO 8601 timestamp with Z or an explicit UTC offset.`);
  }
  // Date.parse normalizes impossible dates such as February 30. Reject those.
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const calendarDate = new Date(0);
  calendarDate.setUTCFullYear(year, month - 1, day);
  if (year < 1 || calendarDate.getUTCMonth() !== month - 1 || calendarDate.getUTCDate() !== day ||
    Number(value.slice(11, 13)) > 23) {
    invalid(`${name} is not a valid calendar date.`);
  }
  try {
    return Timestamp.fromMillis(Date.parse(value));
  } catch {
    invalid(`${name} is outside the supported timestamp range.`);
  }
}

function projectFields(body: Record<string, unknown>, create: boolean): Record<string, unknown> {
  allowedFields(body, create ? ["id", "name", "color", "isPinned"] : ["name", "color", "isPinned"]);
  const fields: Record<string, unknown> = {};
  if (create || "name" in body) {
    if (typeof body.name !== "string" || !body.name.trim() || body.name.length > 100) {
      invalid("name must contain 1–100 characters and cannot be blank.");
    }
    fields.name = body.name;
  }
  if (create || "color" in body) {
    if (typeof body.color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(body.color)) invalid("color must be #RRGGBB.");
    fields.color = body.color;
  }
  if ("isPinned" in body && typeof body.isPinned !== "boolean") invalid("isPinned must be a boolean.");
  if (create || "isPinned" in body) fields.isPinned = body.isPinned ?? false;
  return fields;
}

function eventFields(body: Record<string, unknown>, create: boolean): Record<string, unknown> {
  allowedFields(body, create
    ? ["id", "projectId", "startTime", "endTime", "description", "isActive"]
    : ["projectId", "startTime", "endTime", "description", "isActive"]);
  const fields: Record<string, unknown> = {};
  if (create || "projectId" in body) fields.projectId = id(body.projectId);
  if (create || "startTime" in body) fields.startTime = date(body.startTime, "startTime");
  if ("endTime" in body) fields.endTime = body.endTime === null ? null : date(body.endTime, "endTime");
  if ("description" in body) {
    if (typeof body.description !== "string" || body.description.length > 10000) {
      invalid("description must be a string of at most 10000 characters; use an empty string to clear it.");
    }
    fields.description = body.description;
  }
  if ("isActive" in body && typeof body.isActive !== "boolean") invalid("isActive must be a boolean.");
  if (create || "isActive" in body) fields.isActive = body.isActive ?? false;
  return fields;
}

function validateRange(data: FirebaseFirestore.DocumentData): void {
  if (data.isActive === true) {
    if (data.endTime != null) invalid("Active events must have a null or omitted endTime.");
  } else if (!(data.endTime instanceof Timestamp) || !(data.startTime instanceof Timestamp) ||
    data.endTime.toMillis() <= data.startTime.toMillis()) {
    invalid("Completed events require endTime later than startTime.");
  }
}

function owned(snapshot: FirebaseFirestore.DocumentSnapshot, uid: string): FirebaseFirestore.DocumentData {
  const data = snapshot.data();
  if (!data || data.userId !== uid) throw new ApiError(404, "not_found", "Resource not found.");
  return data;
}

function available(data: FirebaseFirestore.DocumentData): void {
  if (data.deletedAt != null) throw new ApiError(409, "resource_deleted", "Resource is in Recently Deleted. Restore it in the app first.");
}

function serialize(snapshot: FirebaseFirestore.DocumentSnapshot): Record<string, unknown> {
  const data = snapshot.data()!;
  // Explicit projection avoids accidentally exposing future internal fields.
  const result: Record<string, unknown> = { id: snapshot.id };
  for (const key of ["name", "color", "isPinned", "projectId", "startTime", "endTime", "description", "isActive", "createdAt", "updatedAt", "deletedAt", "purgeAt"]) {
    if (key in data) result[key] = data[key] instanceof Timestamp ? data[key].toDate().toISOString() : data[key];
  }
  return result;
}

/** One HTTP function, two resource families. Auth is injected for isolated tests. */
export function createAgentApiHandler(
  db: Firestore,
  verifyToken: (token: string) => Promise<{ uid: string }>,
): (req: Request, res: Response) => Promise<void> {
  return async (req, res) => {
    res.set("Cache-Control", "no-store");
    try {
      const bearer = /^Bearer (\S+)$/i.exec(req.get("Authorization") ?? "");
      if (!bearer) throw new ApiError(401, "unauthenticated", "Provide a Firebase ID token as Authorization: Bearer <token>.");
      let uid: string;
      try {
        uid = (await verifyToken(bearer[1])).uid;
        if (!uid) throw new Error("Missing UID");
      } catch {
        throw new ApiError(401, "unauthenticated", "Invalid, expired, or revoked Firebase ID token.");
      }

      const match = /^\/(projects|events)(?:\/([A-Za-z0-9_-]{1,128}))?\/?$/.exec(req.path);
      if (!match) throw new ApiError(404, "not_found", "Use /projects or /events, optionally followed by /{id}.");
      const [, resource, resourceId] = match;
      const collection = db.collection(resource === "projects" ? "projects" : "timeEntries");
      const methods = resourceId ? (resource === "events" ? "GET, PATCH, DELETE" : "GET, PATCH") : "GET, POST";
      if (!methods.split(", ").includes(req.method)) {
        res.set("Allow", methods);
        throw new ApiError(405, "method_not_allowed", `Allowed methods: ${methods}.`);
      }
      if (req.method === "GET" && !resourceId) {
        // Document-ID ordering avoids new composite indexes. Pagination is bounded
        // even when a page contains only hidden/deleted or filtered documents.
        allowedFields(req.query, resource === "events" ? ["limit", "cursor", "includeDeleted", "projectId", "from", "to", "isActive"] : ["limit", "cursor", "includeDeleted"]);
        const scalar = (key: string): string | undefined => {
          const value = req.query[key];
          if (value === undefined) return undefined;
          if (typeof value !== "string") invalid(`${key} must be a single string.`);
          return value;
        };
        const boolean = (key: string): boolean | undefined => {
          const value = scalar(key);
          if (value !== undefined && value !== "true" && value !== "false") invalid(`${key} must be true or false.`);
          return value === undefined ? undefined : value === "true";
        };
        const rawLimit = scalar("limit") ?? "100";
        if (!/^\d+$/.test(rawLimit) || +rawLimit < 1 || +rawLimit > 200) invalid("limit must be an integer from 1 to 200.");
        const limit = +rawLimit;
        const cursor = scalar("cursor");
        if (cursor !== undefined) id(cursor);
        const includeDeleted = boolean("includeDeleted") ?? false;
        const projectId = scalar("projectId");
        if (projectId !== undefined) id(projectId);
        const isActive = boolean("isActive");
        const from = scalar("from") === undefined ? undefined : date(scalar("from"), "from").toMillis();
        const to = scalar("to") === undefined ? undefined : date(scalar("to"), "to").toMillis();
        if (from !== undefined && to !== undefined && from >= to) invalid("from must be earlier than to.");
        let query = collection.where("userId", "==", uid).orderBy(FieldPath.documentId()).limit(limit);
        if (cursor !== undefined) query = query.startAfter(cursor);
        const page = await query.get();
        const data = page.docs.filter((doc) => {
          const entry = doc.data();
          const start = entry.startTime instanceof Timestamp ? entry.startTime.toMillis() : undefined;
          return (includeDeleted || entry.deletedAt == null) &&
            (projectId === undefined || entry.projectId === projectId) &&
            (isActive === undefined || entry.isActive === isActive) &&
            (from === undefined || (start !== undefined && start >= from)) &&
            (to === undefined || (start !== undefined && start < to));
        }).map(serialize);
        res.status(200).json({ data, nextCursor: page.size === limit ? page.docs.at(-1)!.id : null });
        return;
      }
      if (req.method === "GET") {
        const snapshot = await collection.doc(resourceId!).get();
        owned(snapshot, uid);
        res.status(200).json({ data: serialize(snapshot) });
        return;
      }
      let body: Record<string, unknown> = {};
      if (req.method !== "DELETE") {
        if (!req.is("application/json")) throw new ApiError(415, "unsupported_media_type", "Use Content-Type: application/json.");
        if (req.rawBody && req.rawBody.length > 32768) throw new ApiError(413, "payload_too_large", "Request body must not exceed 32 KiB.");
        body = object(req.body);
      }
      const create = req.method === "POST";
      const ref = collection.doc(create ? (body.id === undefined ? randomUUID() : id(body.id)) : resourceId!);
      const fields = req.method === "DELETE" ? {} : resource === "projects" ? projectFields(body, create) : eventFields(body, create);
      if (req.method === "PATCH" && Object.keys(fields).length === 0) invalid("Supply at least one editable field.");
      await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        const now = Timestamp.now();
        if (create && snapshot.exists) {
          // Same response for another tenant's ID: never reveal its contents.
          throw new ApiError(409, "already_exists", "ID already exists. Choose another ID; do not retry with a new ID after an ambiguous response without first checking your original ID.");
        }
        const existing = create ? {} : owned(snapshot, uid);
        if (req.method === "DELETE") {
          if (existing.deletedAt != null) return; // retry-safe soft deletion
          transaction.update(ref, {
            deletedAt: now,
            purgeAt: Timestamp.fromMillis(now.toMillis() + 30 * 86400000),
            deletionId: randomUUID(),
            updatedAt: now,
          });
          return;
        }
        available(existing);
        const merged = { ...existing, ...fields };
        if (resource === "events") {
          validateRange(merged);
          const project = await transaction.get(db.collection("projects").doc(merged.projectId as string));
          available(owned(project, uid));
        }
        if (create) {
          transaction.create(ref, { ...fields, userId: uid, createdAt: now, updatedAt: now });
        } else {
          transaction.update(ref, { ...fields, updatedAt: now });
        }
      });
      if (req.method === "DELETE") {
        res.status(204).send();
      } else {
        res.status(create ? 201 : 200).json({ data: serialize(await ref.get()) });
      }
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.status).json({ error: { code: error.code, message: error.message } });
      } else {
        logger.error("Agent API request failed", error);
        res.status(500).json({ error: { code: "internal", message: "Request failed. Retry safely using the same resource ID." } });
      }
    }
  };
}
