"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTimeTrackingContext } from "@/contexts/TimeTrackingContext";
import { TimeEntry } from "@/types";
import { subscribeToTimeEntries } from "@/lib/firebase-service";

export function useTimeTracking() {
  return useTimeTrackingContext();
}

/**
 * Full historical entries are only needed by detailed history and calendar
 * screens. Dashboard and pinned-project views use aggregate summaries instead.
 */
export function useTimeEntries() {
  const { user } = useAuth();
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);

  useEffect(() => {
    if (!user) {
      setTimeEntries([]);
      return;
    }
    return subscribeToTimeEntries(user.uid, setTimeEntries);
  }, [user]);

  return timeEntries;
}
