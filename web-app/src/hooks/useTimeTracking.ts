"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useElapsedTimeContext,
  useTimeTrackingContext,
} from "@/contexts/TimeTrackingContext";
import { TimeEntry } from "@/types";
import { subscribeToTimeEntries } from "@/lib/firebase-service";

export function useTimeTracking() {
  return useTimeTrackingContext();
}

/** Subscribe only to the live elapsed label, avoiding timer-driven rerenders
 * in screens that only need projects or tracking actions. */
export function useElapsedTime() {
  return useElapsedTimeContext();
}

/**
 * Full historical entries are only needed by detailed history and calendar
 * screens. Dashboard and pinned-project views use aggregate summaries instead.
 */
export function useTimeEntries() {
  return useTimeEntriesWithStatus().entries;
}

export function useTimeEntriesWithStatus() {
  const { user, loading: isAuthLoading } = useAuth();
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;

    if (!user) {
      setTimeEntries([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    return subscribeToTimeEntries(
      user.uid,
      (entries) => {
        setTimeEntries(entries);
        setIsLoading(false);
      },
      (subscriptionError) => {
        setError(subscriptionError);
        setIsLoading(false);
      },
    );
  }, [isAuthLoading, user]);

  return { entries: timeEntries, isLoading, error };
}
