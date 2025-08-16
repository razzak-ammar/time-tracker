"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Project, TimeEntry } from "@/types";
import {
  createTimeEntry,
  updateTimeEntry,
  subscribeToActiveTimeEntry,
  subscribeToProjects,
  subscribeToTimeEntries,
} from "@/lib/firebase-service";
import { formatDistanceToNow } from "date-fns";

export function useTimeTracking() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [activeTimeEntry, setActiveTimeEntry] = useState<TimeEntry | null>(
    null,
  );
  const [elapsedTime, setElapsedTime] = useState<string>("");

  // Subscribe to projects
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToProjects(user.uid, setProjects);
    return unsubscribe;
  }, [user]);

  // Subscribe to time entries
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToTimeEntries(user.uid, setTimeEntries);
    return unsubscribe;
  }, [user]);

  // Subscribe to active time entry
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToActiveTimeEntry(
      user.uid,
      setActiveTimeEntry,
    );
    return unsubscribe;
  }, [user]);

  // Update elapsed time for active entry
  useEffect(() => {
    if (!activeTimeEntry) {
      setElapsedTime("");
      return;
    }

    const updateElapsedTime = () => {
      const elapsed = formatDistanceToNow(activeTimeEntry.startTime, {
        includeSeconds: true,
      });
      setElapsedTime(elapsed);
    };

    updateElapsedTime();
    const interval = setInterval(updateElapsedTime, 1000);

    return () => clearInterval(interval);
  }, [activeTimeEntry]);

  const startTracking = useCallback(
    async (projectId: string) => {
      if (!user) return;

      const newTimeEntry: Omit<TimeEntry, "id" | "createdAt" | "updatedAt"> = {
        projectId,
        userId: user.uid,
        startTime: new Date(),
        isActive: true,
      };

      await createTimeEntry(newTimeEntry);
    },
    [user],
  );

  const stopTracking = useCallback(async () => {
    if (!activeTimeEntry || !user) return;

    await updateTimeEntry(activeTimeEntry.id, {
      endTime: new Date(),
      isActive: false,
    });
  }, [activeTimeEntry, user]);

  const updateTimeEntryDescription = useCallback(
    async (timeEntryId: string, description: string) => {
      if (!user) return;

      await updateTimeEntry(timeEntryId, { description });
    },
    [user],
  );

  const getTimeEntriesForProject = useCallback(
    (projectId: string) => {
      return timeEntries.filter((entry) => entry.projectId === projectId);
    },
    [timeEntries],
  );

  const getPinnedProjects = useCallback(() => {
    return projects.filter((p) => p.isPinned);
  }, [projects]);

  return {
    projects,
    timeEntries,
    activeTimeEntry,
    elapsedTime,
    startTracking,
    stopTracking,
    updateTimeEntryDescription,
    getTimeEntriesForProject,
    getPinnedProjects,
  };
}
