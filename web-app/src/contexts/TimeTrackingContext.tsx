"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { Project, TimeEntry } from "@/types";
import {
  createTimeEntry,
  subscribeToActiveTimeEntry,
  subscribeToMostRecentTimeEntry,
  subscribeToProjects,
  updateTimeEntry,
} from "@/lib/firebase-service";

interface TimeTrackingContextValue {
  projects: Project[];
  activeTimeEntry: TimeEntry | null;
  elapsedTime: string;
  mostRecentlyUsedProject: Project | null;
  startTracking: (projectId: string) => Promise<void>;
  stopTracking: () => Promise<void>;
  updateTimeEntryDescription: (timeEntryId: string, description: string) => Promise<void>;
  updateTimeEntryFields: (timeEntryId: string, updates: Partial<TimeEntry>) => Promise<void>;
  getPinnedProjects: () => Project[];
  createManualEntry: (projectId: string, startTime: Date, endTime: Date, description?: string) => Promise<void>;
}

const TimeTrackingContext = createContext<TimeTrackingContextValue | undefined>(undefined);

export function TimeTrackingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeTimeEntry, setActiveTimeEntry] = useState<TimeEntry | null>(null);
  const [mostRecentTimeEntry, setMostRecentTimeEntry] = useState<TimeEntry | null>(null);
  const [elapsedTime, setElapsedTime] = useState("");

  useEffect(() => {
    if (!user) {
      setProjects([]);
      return;
    }
    return subscribeToProjects(user.uid, setProjects);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setActiveTimeEntry(null);
      return;
    }
    return subscribeToActiveTimeEntry(user.uid, setActiveTimeEntry);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setMostRecentTimeEntry(null);
      return;
    }
    return subscribeToMostRecentTimeEntry(user.uid, setMostRecentTimeEntry);
  }, [user]);

  useEffect(() => {
    if (!activeTimeEntry) {
      setElapsedTime("");
      return;
    }
    const updateElapsedTime = () => setElapsedTime(formatDistanceToNow(activeTimeEntry.startTime, { includeSeconds: true }));
    updateElapsedTime();
    const interval = setInterval(updateElapsedTime, 1000);
    return () => clearInterval(interval);
  }, [activeTimeEntry]);

  const startTracking = useCallback(async (projectId: string) => {
    if (!user) return;
    await createTimeEntry({ projectId, userId: user.uid, startTime: new Date(), isActive: true });
  }, [user]);

  const stopTracking = useCallback(async () => {
    if (!activeTimeEntry || !user) return;
    await updateTimeEntry(activeTimeEntry.id, { endTime: new Date(), isActive: false });
  }, [activeTimeEntry, user]);

  const updateTimeEntryDescription = useCallback(async (timeEntryId: string, description: string) => {
    if (!user) return;
    await updateTimeEntry(timeEntryId, { description });
  }, [user]);

  const updateTimeEntryFields = useCallback(async (timeEntryId: string, updates: Partial<TimeEntry>) => {
    if (!user) return;
    // Resizing or moving a running entry on the calendar supplies an end
    // time. That action is a completion, so keep the persisted timer state
    // consistent with the range used by reporting.
    const completesActiveEntry =
      activeTimeEntry?.id === timeEntryId && updates.endTime !== undefined;
    await updateTimeEntry(timeEntryId, {
      ...updates,
      ...(completesActiveEntry ? { isActive: false } : {}),
    });
  }, [activeTimeEntry, user]);

  const createManualEntry = useCallback(async (projectId: string, startTime: Date, endTime: Date, description?: string) => {
    if (!user) return;
    const trimmedDescription = description?.trim();
    await createTimeEntry({
      projectId,
      userId: user.uid,
      startTime,
      endTime,
      isActive: false,
      ...(trimmedDescription ? { description: trimmedDescription } : {}),
    });
  }, [user]);

  const mostRecentlyUsedProject = useMemo(() => {
    if (!projects.length) return null;
    return projects.find((project) => project.id === mostRecentTimeEntry?.projectId)
      ?? projects.find((project) => project.isPinned)
      ?? projects[0];
  }, [mostRecentTimeEntry, projects]);

  const getPinnedProjects = useCallback(() => projects.filter((project) => project.isPinned), [projects]);

  return (
    <TimeTrackingContext.Provider value={{
      projects,
      activeTimeEntry,
      elapsedTime,
      mostRecentlyUsedProject,
      startTracking,
      stopTracking,
      updateTimeEntryDescription,
      updateTimeEntryFields,
      getPinnedProjects,
      createManualEntry,
    }}>
      {children}
    </TimeTrackingContext.Provider>
  );
}

export function useTimeTrackingContext() {
  const context = useContext(TimeTrackingContext);
  if (!context) throw new Error("useTimeTracking must be used within TimeTrackingProvider");
  return context;
}
