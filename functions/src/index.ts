import { initializeApp } from "firebase-admin/app";
import {
  FieldValue,
  Firestore,
  getFirestore,
} from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import {
  Contribution,
  TimeEntryDocument,
  contributionFromEntry,
} from "./aggregate-utils.js";

initializeApp();

const db = getFirestore();
const SCHEMA_VERSION = 1;

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
