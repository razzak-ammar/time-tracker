'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Organization, TimeEntry } from '@/types';
import {
  createTimeEntry,
  updateTimeEntry,
  subscribeToActiveTimeEntry,
  subscribeToOrganizations,
  subscribeToTimeEntries,
} from '@/lib/firebase-service';
import { formatDistanceToNow } from 'date-fns';

export function useTimeTracking() {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [activeTimeEntry, setActiveTimeEntry] = useState<TimeEntry | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>('');

  // Subscribe to organizations
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToOrganizations(user.uid, setOrganizations);
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

    const unsubscribe = subscribeToActiveTimeEntry(user.uid, setActiveTimeEntry);
    return unsubscribe;
  }, [user]);

  // Update elapsed time for active entry
  useEffect(() => {
    if (!activeTimeEntry) {
      setElapsedTime('');
      return;
    }

    const updateElapsedTime = () => {
      const elapsed = formatDistanceToNow(activeTimeEntry.startTime, { includeSeconds: true });
      setElapsedTime(elapsed);
    };

    updateElapsedTime();
    const interval = setInterval(updateElapsedTime, 1000);

    return () => clearInterval(interval);
  }, [activeTimeEntry]);

  const startTracking = useCallback(async (organizationId: string) => {
    if (!user) return;

    const newTimeEntry: Omit<TimeEntry, 'id' | 'createdAt' | 'updatedAt'> = {
      organizationId,
      userId: user.uid,
      startTime: new Date(),
      isActive: true,
    };

    await createTimeEntry(newTimeEntry);
  }, [user]);

  const stopTracking = useCallback(async () => {
    if (!activeTimeEntry || !user) return;

    await updateTimeEntry(activeTimeEntry.id, {
      endTime: new Date(),
      isActive: false,
    });
  }, [activeTimeEntry, user]);

  const updateTimeEntryDescription = useCallback(async (timeEntryId: string, description: string) => {
    if (!user) return;

    await updateTimeEntry(timeEntryId, { description });
  }, [user]);

  const getTimeEntriesForOrganization = useCallback((organizationId: string) => {
    return timeEntries.filter(entry => entry.organizationId === organizationId);
  }, [timeEntries]);

  const getPinnedOrganizations = useCallback(() => {
    return organizations.filter(org => org.isPinned);
  }, [organizations]);

  return {
    organizations,
    timeEntries,
    activeTimeEntry,
    elapsedTime,
    startTracking,
    stopTracking,
    updateTimeEntryDescription,
    getTimeEntriesForOrganization,
    getPinnedOrganizations,
  };
}
