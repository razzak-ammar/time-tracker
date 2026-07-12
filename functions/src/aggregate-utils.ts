import { Timestamp } from "firebase-admin/firestore";
import { DateTime } from "luxon";

export const DEFAULT_REPORTING_TIME_ZONE = "UTC";

export interface TimeEntryDocument {
  userId?: unknown;
  projectId?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  isActive?: unknown;
  reportingTimeZone?: unknown;
}

export interface Contribution {
  userId: string;
  projectId: string;
  durationSeconds: number;
  completedDateKey: string;
  dailyDurations: Map<string, number>;
}

export function isValidTimeZone(value: string): boolean {
  return DateTime.now().setZone(value).isValid;
}

export function reportingTimeZone(value: unknown, fallback = DEFAULT_REPORTING_TIME_ZONE): string {
  return typeof value === "string" && isValidTimeZone(value) ? value : fallback;
}

export function dateKey(date: Date, timeZone: string): string {
  return DateTime.fromJSDate(date, { zone: timeZone }).toISODate()!;
}

function timestampToDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  return null;
}

/**
 * Schema version 1 reports daily data in UTC. A completed session belongs to
 * its end date for session counts, while its duration is split across days.
 */
export function contributionFromEntry(
  data: TimeEntryDocument | undefined,
  fallbackTimeZone = DEFAULT_REPORTING_TIME_ZONE,
): Contribution | null {
  if (!data || data.isActive === true) return null;

  const userId = typeof data.userId === "string" ? data.userId : null;
  const projectId = typeof data.projectId === "string" ? data.projectId : null;
  const start = timestampToDate(data.startTime);
  const end = timestampToDate(data.endTime);
  const timeZone = reportingTimeZone(data.reportingTimeZone, fallbackTimeZone);

  if (!userId || !projectId || !start || !end || end <= start) return null;

  const durationSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);
  if (durationSeconds <= 0) return null;

  const dailyDurations = new Map<string, number>();
  let cursor = start.getTime();
  const endMs = end.getTime();
  let allocatedSeconds = 0;
  let lastDayKey = dateKey(start, timeZone);

  while (cursor < endMs) {
    const cursorDate = DateTime.fromMillis(cursor, { zone: timeZone });
    const nextMidnight = cursorDate.startOf("day").plus({ days: 1 }).toMillis();
    const segmentEnd = Math.min(nextMidnight, endMs);
    const seconds = Math.floor((segmentEnd - cursor) / 1000);
    const key = cursorDate.toISODate()!;
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
    completedDateKey: dateKey(end, timeZone),
    dailyDurations,
  };
}
