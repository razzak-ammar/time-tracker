import { initializeApp } from "firebase-admin/app";
import {
  FieldPath,
  FieldValue,
  Firestore,
  getFirestore,
  Timestamp,
} from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { randomUUID } from "node:crypto";
import {
  Contribution,
  TimeEntryDocument,
  contributionFromEntry,
} from "./aggregate-utils.js";

initializeApp();

const db = getFirestore();
const SCHEMA_VERSION = 1;
const TRASH_RETENTION_DAYS = 30;
const PAGE_SIZE = 400;

type TrashType = "project" | "timeEntry";

function requireId(value: unknown, name: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpsError("invalid-argument", `${name} is required.`);
  }
  return value;
}

function requireUserId(uid: string | undefined): string {
  if (!uid) throw new HttpsError("unauthenticated", "Sign in to manage deleted data.");
  return uid;
}

function purgeTimestamp(): Timestamp {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + TRASH_RETENTION_DAYS);
  return Timestamp.fromDate(date);
}

function isTrashed(data: FirebaseFirestore.DocumentData): boolean {
  return data.deletedAt instanceof Timestamp;
}

async function forEachProjectEntry(
  userId: string,
  projectId: string,
  operation: (writer: FirebaseFirestore.BulkWriter, snapshot: FirebaseFirestore.QueryDocumentSnapshot) => void,
): Promise<void> {
  let lastSnapshot: FirebaseFirestore.QueryDocumentSnapshot | undefined;

  while (true) {
    let entriesQuery = db
      .collection("timeEntries")
      .where("userId", "==", userId)
      .where("projectId", "==", projectId)
      .orderBy(FieldPath.documentId())
      .limit(PAGE_SIZE);
    if (lastSnapshot) entriesQuery = entriesQuery.startAfter(lastSnapshot);

    const page = await entriesQuery.get();
    if (page.empty) return;

    const writer = db.bulkWriter();
    for (const entry of page.docs) operation(writer, entry);
    await writer.close();

    lastSnapshot = page.docs.at(-1);
    if (page.size < PAGE_SIZE) return;
  }
}

/**
 * Trashes a project and every currently visible entry. This is callable-only:
 * users cannot forge the deletion group or delete a document outright.
 * Paging + BulkWriter keeps the cascade safe for projects with thousands of entries.
 */
export const trashProject = onCall(async (request) => {
  const userId = requireUserId(request.auth?.uid);
  const projectId = requireId(request.data?.projectId, "projectId");
  const projectRef = db.collection("projects").doc(projectId);
  const deletion = await db.runTransaction(async (transaction) => {
    const project = await transaction.get(projectRef);
    if (!project.exists || project.data()?.userId !== userId) {
      throw new HttpsError("not-found", "Project not found.");
    }

    const projectData = project.data()!;
    if (isTrashed(projectData)) {
      if (typeof projectData.deletionId !== "string" || !(projectData.purgeAt instanceof Timestamp)) {
        throw new HttpsError("failed-precondition", "Project deletion metadata is incomplete.");
      }
      return {
        deletionId: projectData.deletionId,
        purgeAt: projectData.purgeAt as Timestamp,
      };
    }

    const deletionId = randomUUID();
    const purgeAt = purgeTimestamp();
    transaction.update(projectRef, {
      deletedAt: FieldValue.serverTimestamp(),
      purgeAt,
      deletionId,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { deletionId, purgeAt };
  });

  const { deletionId, purgeAt } = deletion;
  await forEachProjectEntry(userId, projectId, (writer, entry) => {
    // An entry that was independently deleted stays independently deleted.
    if (!isTrashed(entry.data())) {
      writer.update(entry.ref, {
        deletedAt: FieldValue.serverTimestamp(),
        purgeAt,
        deletionId,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  });
  logger.info("Trashed project and associated entries", { userId, projectId, deletionId });
});

export const restoreProject = onCall(async (request) => {
  const userId = requireUserId(request.auth?.uid);
  const projectId = requireId(request.data?.projectId, "projectId");
  const projectRef = db.collection("projects").doc(projectId);
  const project = await projectRef.get();
  if (!project.exists || project.data()?.userId !== userId) {
    throw new HttpsError("not-found", "Project not found.");
  }
  const projectData = project.data()!;
  if (!isTrashed(projectData)) return;
  const deletionId = projectData.deletionId;

  // Restore entries first so an interrupted call leaves the project marked as
  // deleted and can safely resume the same cascade on retry.
  if (typeof deletionId === "string") {
    await forEachProjectEntry(userId, projectId, (writer, entry) => {
      if (entry.data().deletionId === deletionId) {
        writer.update(entry.ref, {
          deletedAt: FieldValue.delete(),
          purgeAt: FieldValue.delete(),
          deletionId: FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    });
  }
  await projectRef.update({
    deletedAt: FieldValue.delete(),
    purgeAt: FieldValue.delete(),
    deletionId: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  logger.info("Restored project and associated entries", { userId, projectId, deletionId });
});

export const trashTimeEntry = onCall(async (request) => {
  const userId = requireUserId(request.auth?.uid);
  const entryId = requireId(request.data?.entryId, "entryId");
  const entryRef = db.collection("timeEntries").doc(entryId);
  const entry = await entryRef.get();
  if (!entry.exists || entry.data()?.userId !== userId) {
    throw new HttpsError("not-found", "Time entry not found.");
  }
  if (isTrashed(entry.data()!)) return;
  await entryRef.update({
    deletedAt: FieldValue.serverTimestamp(),
    purgeAt: purgeTimestamp(),
    deletionId: randomUUID(),
    updatedAt: FieldValue.serverTimestamp(),
  });
});

export const restoreTimeEntry = onCall(async (request) => {
  const userId = requireUserId(request.auth?.uid);
  const entryId = requireId(request.data?.entryId, "entryId");
  const entryRef = db.collection("timeEntries").doc(entryId);
  const entry = await entryRef.get();
  if (!entry.exists || entry.data()?.userId !== userId) {
    throw new HttpsError("not-found", "Time entry not found.");
  }
  if (!isTrashed(entry.data()!)) return;
  const project = await db.collection("projects").doc(entry.data()!.projectId).get();
  if (!project.exists || project.data()?.userId !== userId || isTrashed(project.data()!)) {
    throw new HttpsError("failed-precondition", "Restore the project before restoring this entry.");
  }
  await entryRef.update({
    deletedAt: FieldValue.delete(),
    purgeAt: FieldValue.delete(),
    deletionId: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  });
});

/** Permanently remove only items already in the trash; normal clients have no delete rule. */
export const permanentlyDeleteTrash = onCall(async (request) => {
  const userId = requireUserId(request.auth?.uid);
  const type = request.data?.type as TrashType;
  if (type !== "project" && type !== "timeEntry") {
    throw new HttpsError("invalid-argument", "type must be project or timeEntry.");
  }
  const id = requireId(request.data?.id, "id");
  const collectionName = type === "project" ? "projects" : "timeEntries";
  const ref = db.collection(collectionName).doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists || snapshot.data()?.userId !== userId) {
    throw new HttpsError("not-found", "Deleted item not found.");
  }
  if (!isTrashed(snapshot.data()!)) {
    throw new HttpsError("failed-precondition", "Only deleted items can be permanently removed.");
  }
  if (type === "project") {
    await forEachProjectEntry(userId, id, (writer, entry) => writer.delete(entry.ref));
  }
  await ref.delete();
  logger.info("Permanently removed trashed item", { userId, type, id });
});

interface AggregateDelta {
  completedSessionCount: number;
  durationSeconds: number;
}

function addDelta(
  deltas: Map<string, AggregateDelta>,
  key: string,
  sessions: number,
  durationSeconds: number,
): void {
  const existing = deltas.get(key) ?? {
    completedSessionCount: 0,
    durationSeconds: 0,
  };
  existing.completedSessionCount += sessions;
  existing.durationSeconds += durationSeconds;
  deltas.set(key, existing);
}

function applyContribution(
  overviewDeltas: Map<string, AggregateDelta>,
  projectDeltas: Map<string, AggregateDelta>,
  dailyDeltas: Map<string, Map<string, AggregateDelta>>,
  contribution: Contribution | null,
  sign: 1 | -1,
): void {
  if (!contribution) return;

  addDelta(
    overviewDeltas,
    contribution.userId,
    sign,
    sign * contribution.durationSeconds,
  );
  addDelta(
    projectDeltas,
    `${contribution.userId}/${contribution.projectId}`,
    sign,
    sign * contribution.durationSeconds,
  );

  for (const [day, seconds] of contribution.dailyDurations) {
    const dailyKey = `${contribution.userId}/${day}`;
    const byProject = dailyDeltas.get(dailyKey) ?? new Map<string, AggregateDelta>();
    // Sessions are counted on their completion date, matching the legacy
    // dashboard definition. Duration is still split across every day touched.
    addDelta(
      byProject,
      contribution.projectId,
      day === contribution.completedDateKey ? sign : 0,
      sign * seconds,
    );
    dailyDeltas.set(dailyKey, byProject);
  }
}

async function applyAggregateDeltas(
  firestore: Firestore,
  eventId: string,
  before: TimeEntryDocument | undefined,
  after: TimeEntryDocument | undefined,
): Promise<void> {
  const overviewDeltas = new Map<string, AggregateDelta>();
  const projectDeltas = new Map<string, AggregateDelta>();
  const dailyDeltas = new Map<string, Map<string, AggregateDelta>>();

  applyContribution(
    overviewDeltas,
    projectDeltas,
    dailyDeltas,
    contributionFromEntry(before),
    -1,
  );
  applyContribution(
    overviewDeltas,
    projectDeltas,
    dailyDeltas,
    contributionFromEntry(after),
    1,
  );

  return firestore.runTransaction(async (transaction) => {
    const eventRef = firestore.doc(`aggregateEvents/${eventId}`);
    const eventSnapshot = await transaction.get(eventRef);
    if (eventSnapshot.exists) return;

    transaction.create(eventRef, {
      processedAt: FieldValue.serverTimestamp(),
      schemaVersion: SCHEMA_VERSION,
    });

    for (const [uid, delta] of overviewDeltas) {
      if (!delta.completedSessionCount && !delta.durationSeconds) continue;
      transaction.set(
        firestore.doc(`users/${uid}/summaries/overview`),
        {
          completedSessionCount: FieldValue.increment(delta.completedSessionCount),
          completedDurationSeconds: FieldValue.increment(delta.durationSeconds),
          schemaVersion: SCHEMA_VERSION,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    for (const [key, delta] of projectDeltas) {
      if (!delta.completedSessionCount && !delta.durationSeconds) continue;
      const [uid, projectId] = key.split("/");
      transaction.set(
        firestore.doc(`users/${uid}/projectSummaries/${projectId}`),
        {
          projectId,
          completedSessionCount: FieldValue.increment(delta.completedSessionCount),
          completedDurationSeconds: FieldValue.increment(delta.durationSeconds),
          updatedAt: FieldValue.serverTimestamp(),
          schemaVersion: SCHEMA_VERSION,
        },
        { merge: true },
      );
    }

    for (const [key, byProject] of dailyDeltas) {
      const [uid, day] = key.split("/");
      const dailyRef = firestore.doc(`users/${uid}/dailySummaries/${day}`);
      let totalSessionDelta = 0;
      let totalDurationDelta = 0;
      for (const delta of byProject.values()) {
        totalSessionDelta += delta.completedSessionCount;
        totalDurationDelta += delta.durationSeconds;
      }

      const byProjectUpdates: Record<string, {
        completedSessionCount: ReturnType<typeof FieldValue.increment>;
        durationSeconds: ReturnType<typeof FieldValue.increment>;
      }> = {};

      for (const [projectId, delta] of byProject) {
        if (!delta.completedSessionCount && !delta.durationSeconds) continue;
        byProjectUpdates[projectId] = {
          completedSessionCount: FieldValue.increment(delta.completedSessionCount),
          durationSeconds: FieldValue.increment(delta.durationSeconds),
        };
      }

      transaction.set(
        dailyRef,
        {
          dateKey: day,
          completedSessionCount: FieldValue.increment(totalSessionDelta),
          durationSeconds: FieldValue.increment(totalDurationDelta),
          byProject: byProjectUpdates,
          updatedAt: FieldValue.serverTimestamp(),
          schemaVersion: SCHEMA_VERSION,
        },
        { merge: true },
      );
    }
  });
}

export const aggregateTimeEntry = onDocumentWritten(
  "timeEntries/{entryId}",
  async (event) => {
    await applyAggregateDeltas(
      db,
      event.id,
      event.data?.before.data() as TimeEntryDocument | undefined,
      event.data?.after.data() as TimeEntryDocument | undefined,
    );
    logger.info("Processed time-entry aggregate event", {
      eventId: event.id,
      entryId: event.params.entryId,
    });
  },
);
