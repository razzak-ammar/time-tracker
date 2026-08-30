import { Timestamp } from "firebase-admin/firestore";

export interface TimeEntryDocument {
  userId?: unknown;
  projectId?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  isActive?: unknown;
  /** A trashed entry no longer contributes to any reporting bucket. */
  deletedAt?: unknown;
}

export interface Contribution {
  userId: string;
  projectId: string;
  durationSeconds: number;
  completedDateKey: string;
  dailyDurations: Map<string, number>;
}

export function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function timestampToDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  return null;
}

/**
 * Schema version 1 reports daily data in UTC. A completed session belongs to
 * its UTC end date for session counts, while its duration is split across days.
 */
export function contributionFromEntry(
  data: TimeEntryDocument | undefined,
): Contribution | null {
  // A TTL hard delete arrives with this same deleted version as `before`, so
  // it has no contribution to subtract a second time.
  if (!data || data.isActive === true || data.deletedAt instanceof Timestamp) return null;

  const userId = typeof data.userId === "string" ? data.userId : null;
  const projectId = typeof data.projectId === "string" ? data.projectId : null;
  const start = timestampToDate(data.startTime);
  const end = timestampToDate(data.endTime);

  if (!userId || !projectId || !start || !end || end <= start) return null;

  const durationSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);
  if (durationSeconds <= 0) return null;

  const dailyDurations = new Map<string, number>();
  let cursor = start.getTime();
  const endMs = end.getTime();
  let allocatedSeconds = 0;
  let lastDayKey = dateKey(start);

  while (cursor < endMs) {
    const cursorDate = new Date(cursor);
    const nextMidnight = Date.UTC(
      cursorDate.getUTCFullYear(),
      cursorDate.getUTCMonth(),
      cursorDate.getUTCDate() + 1,
    );
    const segmentEnd = Math.min(nextMidnight, endMs);
    const seconds = Math.floor((segmentEnd - cursor) / 1000);
    const key = dateKey(cursorDate);
    lastDayKey = key;

    if (seconds > 0) {
      dailyDurations.set(key, (dailyDurations.get(key) ?? 0) + seconds);
      allocatedSeconds += seconds;
    }
    cursor = segmentEnd;
  }

  const unallocatedSeconds = durationSeconds - allocatedSeconds;
  if (unallocatedSeconds > 0) {
    dailyDurations.set(
      lastDayKey,
      (dailyDurations.get(lastDayKey) ?? 0) + unallocatedSeconds,
    );
  }

  return {
    userId,
    projectId,
    durationSeconds,
    completedDateKey: dateKey(end),
    dailyDurations,
  };
}
