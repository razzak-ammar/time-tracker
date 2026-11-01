import assert from "node:assert/strict";
import test from "node:test";
import { Timestamp } from "firebase-admin/firestore";
import { createAgentApiHandler } from "../lib/agent-api.js";

const startTime = "2026-11-01T09:00:00-05:00";
const endTime = "2026-11-01T10:00:00-05:00";

// In-memory Firestore boundary: exercise the complete HTTP handler without
// credentials/network. Queued transaction writes commit only after success.
function fixture() {
  const documents = new Map([
    ["projects/p1", { userId: "alice", name: "Work", color: "#112233", isPinned: false }],
    ["projects/other", { userId: "bob", name: "Private", color: "#112233" }],
    ["projects/trash", { userId: "alice", deletedAt: Timestamp.now() }],
  ]);
  function ref(path) {
    return { path, id: path.split("/").at(-1), get: async () => snapshot(path) };
  }
  function snapshot(path) {
    return { id: path.split("/").at(-1), exists: documents.has(path), data: () => documents.get(path), ref: ref(path) };
  }
  function collection(name) {
    const filters = [];
    let count = 100;
    let cursor;
    const query = {
      doc: (id) => ref(`${name}/${id}`),
      where(field, op, value) { assert.equal(op, "=="); filters.push([field, value]); return this; },
      orderBy() { return this; },
      limit(value) { count = value; return this; },
      startAfter(value) { cursor = value; return this; },
      async get() {
        const docs = [...documents.keys()].filter((path) => path.startsWith(`${name}/`))
          .sort().map(snapshot).filter((doc) => filters.every(([key, value]) => doc.data()[key] === value))
          .filter((doc) => cursor === undefined || doc.id > cursor).slice(0, count);
        return { docs, size: docs.length };
      },
    };
    return query;
  }
  const db = {
    collection,
    async runTransaction(fn) {
      const writes = [];
      const result = await fn({
        get: async (reference) => snapshot(reference.path),
        create: (reference, data) => writes.push([reference.path, data]),
        update: (reference, data) => writes.push([reference.path, { ...documents.get(reference.path), ...data }]),
      });
      for (const [path, data] of writes) documents.set(path, data);
      return result;
    },
  };
  const handler = createAgentApiHandler(db, async (token) => {
    if (token !== "valid") throw new Error("revoked or expired");
    return { uid: "alice" };
  });
  async function request(method, path, body, query = {}, token = "valid", contentType = "application/json") {
    const req = {
      method, path, body, query,
      rawBody: Buffer.from(JSON.stringify(body ?? {})),
      get: (header) => header === "Authorization" && token ? `Bearer ${token}` : undefined,
      is: (type) => contentType === type,
    };
    const response = {
      statusCode: 200, headers: {}, body: undefined,
      set(key, value) { this.headers[key] = value; return this; },
      status(code) { this.statusCode = code; return this; },
      json(value) { this.body = value; return this; },
      send() { return this; },
    };
    await handler(req, response);
    return response;
  }
  return { documents, request };
}

async function createEvent(request, body = {}) {
  return request("POST", "/events", { id: "e1", projectId: "p1", startTime, endTime, description: "Planning", ...body });
}

test("requires valid authentication before reading or mutating", async () => {
  const { request, documents } = fixture();
  for (const token of [null, "expired"]) {
    assert.equal((await request("GET", "/projects", undefined, {}, token)).statusCode, 401);
    assert.equal((await request("POST", "/events", {}, {}, token)).statusCode, 401);
  }
  assert.equal(documents.size, 3);
});

test("project list, get, create, and partial edit preserve ownership and audit fields", async () => {
  const { request, documents } = fixture();
  const list = await request("GET", "/projects");
  assert.deepEqual(list.body.data.map((item) => item.id), ["p1"]);
  const created = await request("POST", "/projects", { id: "new", name: "Agent", color: "#ABCDEF" });
  assert.equal(created.statusCode, 201);
  assert.equal(created.body.data.isPinned, false);
  assert.equal(documents.get("projects/new").userId, "alice");
  const createdAt = documents.get("projects/new").createdAt;
  assert.equal((await request("PATCH", "/projects/new", { name: "Updated", isPinned: true })).statusCode, 200);
  assert.equal(documents.get("projects/new").createdAt, createdAt);
  assert.equal((await request("GET", "/projects/new")).body.data.name, "Updated");
});

test("completed events round-trip timestamps, edit description and move projects", async () => {
  const { request, documents } = fixture();
  const result = await createEvent(request);
  assert.equal(result.statusCode, 201);
  assert.equal(result.body.data.startTime, "2026-11-01T14:00:00.000Z");
  assert.equal(result.body.data.isActive, false);
  await request("POST", "/projects", { id: "p2", name: "Second", color: "#123456" });
  const updated = await request("PATCH", "/events/e1", { description: "", projectId: "p2" });
  assert.equal(updated.statusCode, 200);
  assert.equal(updated.body.data.description, "");
  assert.equal(documents.get("timeEntries/e1").projectId, "p2");
  assert.equal((await request("GET", "/events/e1")).statusCode, 200);
});

test("active timer can be started and stopped while invalid merged ranges are rejected", async () => {
  const { request } = fixture();
  assert.equal((await createEvent(request, { isActive: true, endTime: null })).statusCode, 201);
  assert.equal((await request("PATCH", "/events/e1", { isActive: false })).statusCode, 400);
  assert.equal((await request("PATCH", "/events/e1", { endTime })).statusCode, 400);
  assert.equal((await request("PATCH", "/events/e1", { isActive: false, endTime })).statusCode, 200);
  assert.equal((await request("PATCH", "/events/e1", { startTime: "2026-11-01T16:00:00Z" })).statusCode, 400);
});

test("cross-user access is hidden and cannot be used to associate an event", async () => {
  const { request, documents } = fixture();
  for (const method of ["GET", "PATCH"]) {
    assert.equal((await request(method, "/projects/other", { name: "Stolen" })).statusCode, 404);
  }
  documents.set("timeEntries/private", { userId: "bob", projectId: "other", description: "Secret" });
  for (const method of ["GET", "PATCH", "DELETE"]) {
    assert.equal((await request(method, "/events/private", { description: "Stolen" })).statusCode, 404);
  }
  assert.equal((await createEvent(request, { projectId: "other" })).statusCode, 404);
  assert.equal((await createEvent(request, { projectId: "missing" })).statusCode, 404);
  assert.equal(documents.get("timeEntries/private").description, "Secret");
  assert.equal(documents.has("timeEntries/e1"), false);
});

test("delete is retry-safe recoverable trash, hidden from normal lists and blocks edits", async () => {
  const { request, documents } = fixture();
  await createEvent(request);
  assert.equal((await request("DELETE", "/events/e1")).statusCode, 204);
  const trashed = documents.get("timeEntries/e1");
  assert.equal(trashed.purgeAt.toMillis() - trashed.deletedAt.toMillis(), 30 * 86400000);
  assert.equal((await request("DELETE", "/events/e1")).statusCode, 204);
  assert.equal(documents.get("timeEntries/e1").deletionId, trashed.deletionId);
  assert.deepEqual((await request("GET", "/events")).body.data, []);
  assert.equal((await request("GET", "/events", undefined, { includeDeleted: "true" })).body.data.length, 1);
  assert.ok((await request("GET", "/events/e1")).body.data.deletedAt);
  assert.equal((await request("PATCH", "/events/e1", { description: "edit" })).statusCode, 409);
  assert.equal((await createEvent(request, { id: "blocked", projectId: "trash" })).statusCode, 409);
});

test("pagination advances through empty filtered pages without leaking another tenant", async () => {
  const { request } = fixture();
  await createEvent(request, { id: "a" });
  await createEvent(request, { id: "b", startTime: "2026-11-02T10:00:00Z", endTime: "2026-11-02T11:00:00Z" });
  const filters = { limit: "1", from: "2026-11-02T00:00:00Z", to: "2026-11-03T00:00:00Z", projectId: "p1", isActive: "false" };
  const first = await request("GET", "/events", undefined, filters);
  assert.deepEqual(first.body.data, []);
  assert.equal(first.body.nextCursor, "a");
  const second = await request("GET", "/events", undefined, { ...filters, cursor: first.body.nextCursor });
  assert.equal(second.body.data[0].id, "b");
  assert.equal((await request("GET", "/events", undefined, { ...filters, cursor: "b" })).body.nextCursor, null);
});

test("caller IDs prevent duplicate creation on retries", async () => {
  const { request, documents } = fixture();
  assert.equal((await createEvent(request)).statusCode, 201);
  assert.equal((await createEvent(request)).statusCode, 409);
  assert.equal([...documents.keys()].filter((key) => key.startsWith("timeEntries/")).length, 1);
});

test("rejects ownership, audit and trash field injection, empty patches, and invalid bodies", async () => {
  const { request } = fixture();
  for (const field of ["userId", "createdAt", "updatedAt", "deletedAt", "purgeAt", "deletionId", "unexpected"]) {
    assert.equal((await createEvent(request, { [field]: "injected" })).statusCode, 400);
  }
  for (const body of [null, [], "text"]) assert.equal((await request("POST", "/events", body)).statusCode, 400);
  assert.equal((await request("PATCH", "/projects/p1", {})).statusCode, 400);
  assert.equal((await request("PATCH", "/projects/p1", { name: "  " })).statusCode, 400);
  assert.equal((await request("POST", "/projects", { name: "Name", color: "red" })).statusCode, 400);
  assert.equal((await request("POST", "/events", {}, {}, "valid", "text/plain")).statusCode, 415);
  assert.equal((await createEvent(request, { description: "a".repeat(33000) })).statusCode, 413);
});

test("rejects invalid time ranges, timestamps without timezone, malformed IDs, and oversized descriptions", async () => {
  const { request } = fixture();
  for (const body of [
    { endTime: startTime }, { endTime: null }, { endTime: undefined },
    { startTime: "2026-11-01T09:00:00" }, { startTime: "2026-02-30T09:00:00Z" },
    { startTime: "0000-01-01T00:00:00Z" }, { startTime: "2026-11-01T24:00:00Z" },
    { projectId: "../p1" }, { id: "bad/id" }, { isActive: "false" }, { description: "a".repeat(10001) },
  ]) assert.equal((await createEvent(request, body)).statusCode, 400, JSON.stringify(body).slice(0, 100));
});

test("validates query types, unsupported methods and paths", async () => {
  const { request } = fixture();
  for (const query of [
    { limit: "201" }, { limit: "0" }, { limit: "1.5" }, { includeDeleted: "yes" },
    { projectId: ["p1", "p2"] }, { cursor: "bad/id" }, { userId: "bob" },
    { from: endTime, to: startTime }, { isActive: "1" },
  ]) assert.equal((await request("GET", "/events", undefined, query)).statusCode, 400);
  const method = await request("DELETE", "/projects/p1");
  assert.equal(method.statusCode, 405);
  assert.equal(method.headers.Allow, "GET, PATCH");
  assert.equal((await request("GET", "/unknown")).statusCode, 404);
});
