import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { Firestore, getFirestore } from "firebase-admin/firestore";
import {
  TimeEntryDocument,
  contributionFromEntry,
} from "./aggregate-utils.js";

const SCHEMA_VERSION = 1;
const MAX_BATCH_WRITES = 400;
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT ?? "time-tracker-3b6df";

interface SummaryTotal {
  completedSessionCount: number;
  durationSeconds: number;
}

function addTotal(
  totals: Map<string, SummaryTotal>,
  key: string,
  sessions: number,
  durationSeconds: number,
): void {
  const total = totals.get(key) ?? { completedSessionCount: 0, durationSeconds: 0 };
  total.completedSessionCount += sessions;
  total.durationSeconds += durationSeconds;
  totals.set(key, total);
}

function userIdFromArgs(): string | null {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(
      "Usage: npm run backfill -- (--uid <Firebase Auth UID> | --all)",
    );
    process.exit(0);
  }
  const index = process.argv.indexOf("--uid");
  const userId = index >= 0 ? process.argv[index + 1] : undefined;
  const allUsers = process.argv.includes("--all");
  if (allUsers && (!userId || userId.startsWith("--"))) {
    return null;
  }
  if (!userId || userId.startsWith("--") || allUsers) {
    throw new Error(
      "Usage: npm run backfill -- (--uid <Firebase Auth UID> | --all)",
    );
  }
  return userId;
}

function allowsEmptyBackfill(): boolean {
  return process.argv.includes("--allow-empty");
}

async function deleteCollectionDocuments(firestore: Firestore, path: string): Promise<void> {
  const snapshot = await firestore.collection(path).get();
  for (let index = 0; index < snapshot.docs.length; index += MAX_BATCH_WRITES) {
    const batch = firestore.batch();
    snapshot.docs.slice(index, index + MAX_BATCH_WRITES).forEach((document) => batch.delete(document.ref));
    await batch.commit();
  }
}

async function backfillUser(userId: string): Promise<void> {
  const firestore = getFirestore();
  const entries = await firestore.collection("timeEntries").where("userId", "==", userId).get();
  if (entries.empty && !allowsEmptyBackfill()) {
    throw new Error(
      `No timeEntries matched userId ${userId}. Refusing to replace summaries. Verify the exact userId stored on a timeEntries document, then rerun.`,
    );
  }
  const overview: SummaryTotal = { completedSessionCount: 0, durationSeconds: 0 };
  const projects = new Map<string, SummaryTotal>();
  const daily = new Map<string, { total: SummaryTotal; byProject: Map<string, SummaryTotal> }>();

  for (const entry of entries.docs) {
    const contribution = contributionFromEntry(entry.data() as TimeEntryDocument);
    if (!contribution) continue;

    overview.completedSessionCount += 1;
    overview.durationSeconds += contribution.durationSeconds;
    addTotal(projects, contribution.projectId, 1, contribution.durationSeconds);

    for (const [day, durationSeconds] of contribution.dailyDurations) {
      const summary = daily.get(day) ?? {
        total: { completedSessionCount: 0, durationSeconds: 0 },
        byProject: new Map<string, SummaryTotal>(),
      };
      const sessionCount = day === contribution.completedDateKey ? 1 : 0;
      summary.total.completedSessionCount += sessionCount;
      summary.total.durationSeconds += durationSeconds;
      addTotal(summary.byProject, contribution.projectId, sessionCount, durationSeconds);
      daily.set(day, summary);
    }
  }

  // This is a rebuild, not an increment. Do not run it while this user is
  // actively creating/editing entries: pause writes or rerun after the last edit.
  await deleteCollectionDocuments(firestore, `users/${userId}/dailySummaries`);
  await deleteCollectionDocuments(firestore, `users/${userId}/projectSummaries`);

  const writes: Array<(batch: FirebaseFirestore.WriteBatch) => void> = [];
  writes.push((batch) => batch.set(firestore.doc(`users/${userId}/summaries/overview`), {
    completedSessionCount: overview.completedSessionCount,
    completedDurationSeconds: overview.durationSeconds,
    schemaVersion: SCHEMA_VERSION,
    backfilledAt: new Date(),
    updatedAt: new Date(),
  }));

  for (const [projectId, total] of projects) {
    writes.push((batch) => batch.set(firestore.doc(`users/${userId}/projectSummaries/${projectId}`), {
      projectId,
      completedSessionCount: total.completedSessionCount,
      completedDurationSeconds: total.durationSeconds,
      schemaVersion: SCHEMA_VERSION,
      backfilledAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  for (const [day, summary] of daily) {
    const byProject = Object.fromEntries(summary.byProject.entries());
    writes.push((batch) => batch.set(firestore.doc(`users/${userId}/dailySummaries/${day}`), {
      dateKey: day,
      completedSessionCount: summary.total.completedSessionCount,
      durationSeconds: summary.total.durationSeconds,
      byProject,
      schemaVersion: SCHEMA_VERSION,
      backfilledAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  for (let index = 0; index < writes.length; index += MAX_BATCH_WRITES) {
    const batch = firestore.batch();
    writes.slice(index, index + MAX_BATCH_WRITES).forEach((write) => write(batch));
    await batch.commit();
  }

  console.log(`Backfilled ${entries.size} entries for ${userId}.`, {
    completedSessions: overview.completedSessionCount,
    completedDurationSeconds: overview.durationSeconds,
    dailyDocuments: daily.size,
    projectDocuments: projects.size,
  });
}

async function backfillAllUsers(): Promise<void> {
  const firestore = getFirestore();
  const entries = await firestore.collection("timeEntries").get();
  const userIds = new Set<string>();

  for (const entry of entries.docs) {
    const userId = entry.data().userId;
    if (typeof userId === "string" && userId.length > 0) {
      userIds.add(userId);
    }
  }

  console.log(`Found ${userIds.size} users across ${entries.size} time entries.`);
  for (const userId of userIds) {
    await backfillUser(userId);
  }
}

if (getApps().length === 0) {
  initializeApp({
    credential: applicationDefault(),
    projectId: PROJECT_ID,
  });
}

const userId = userIdFromArgs();
const backfill = userId ? backfillUser(userId) : backfillAllUsers();

backfill.catch((error: unknown) => {
  console.error("Backfill failed.", error);
  process.exitCode = 1;
});
