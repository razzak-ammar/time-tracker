"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { DailySummary, OverviewSummary, ProjectSummary } from "@/types";
import {
  subscribeToDailySummaries,
  subscribeToOverviewSummary,
  subscribeToProjectSummaries,
} from "@/lib/firebase-service";
import { currentUtcWeekKeys } from "@/lib/reporting";

export function useDashboardSummaries() {
  const { user } = useAuth();
  const weekKeys = useMemo(() => currentUtcWeekKeys(), []);
  const [overview, setOverview] = useState<OverviewSummary | null>(null);
  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);

  useEffect(() => {
    if (!user) {
      setOverview(null);
      return;
    }
    return subscribeToOverviewSummary(user.uid, setOverview);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setDailySummaries([]);
      return;
    }
    return subscribeToDailySummaries(user.uid, weekKeys, setDailySummaries);
  }, [user, weekKeys]);

  return {
    completedSessionCount: overview?.completedSessionCount ?? 0,
    completedDurationSeconds: overview?.completedDurationSeconds ?? 0,
    weekSessionCount: dailySummaries.reduce((total, day) => total + day.completedSessionCount, 0),
    weekDurationSeconds: dailySummaries.reduce((total, day) => total + day.durationSeconds, 0),
  };
}

export function useProjectSummaries() {
  const { user } = useAuth();
  const [summaries, setSummaries] = useState<ProjectSummary[]>([]);

  useEffect(() => {
    if (!user) {
      setSummaries([]);
      return;
    }
    return subscribeToProjectSummaries(user.uid, setSummaries);
  }, [user]);

  return useMemo(
    () => new Map(summaries.map((summary) => [summary.projectId, summary])),
    [summaries],
  );
}
