import assert from "node:assert/strict";
import test from "node:test";
import { Timestamp } from "firebase-admin/firestore";
import { contributionFromEntry } from "../lib/aggregate-utils.js";

const completedEntry = {
  userId: "user-1",
  projectId: "project-1",
  isActive: false,
  startTime: Timestamp.fromDate(new Date("2026-08-01T09:00:00.000Z")),
  endTime: Timestamp.fromDate(new Date("2026-08-01T10:30:00.000Z")),
};

test("trashed entries do not contribute to aggregate totals", () => {
  assert.equal(contributionFromEntry({ ...completedEntry, deletedAt: Timestamp.now() }), null);
});

test("restored/completed entries contribute exactly their completed duration", () => {
  const contribution = contributionFromEntry(completedEntry);
  assert.equal(contribution?.durationSeconds, 5400);
  assert.equal(contribution?.completedDateKey, "2026-08-01");
});
