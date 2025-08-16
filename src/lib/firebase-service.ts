import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { Organization, TimeEntry, TimeEntryWithOrganization } from "@/types";

// Organizations
export const createOrganization = async (
  organization: Omit<Organization, "id" | "createdAt" | "updatedAt">,
) => {
  const docRef = await addDoc(collection(db, "organizations"), {
    ...organization,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

export const updateOrganization = async (
  id: string,
  updates: Partial<Organization>,
) => {
  const docRef = doc(db, "organizations", id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

export const deleteOrganization = async (id: string) => {
  const docRef = doc(db, "organizations", id);
  await deleteDoc(docRef);
};

export const getOrganizations = async (
  userId: string,
): Promise<Organization[]> => {
  const q = query(
    collection(db, "organizations"),
    where("userId", "==", userId),
  );
  const querySnapshot = await getDocs(q);
  const organizations = querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  })) as Organization[];

  // Sort by creation date in JavaScript instead of Firestore
  return organizations.sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
};

export const subscribeToOrganizations = (
  userId: string,
  callback: (organizations: Organization[]) => void,
) => {
  const q = query(
    collection(db, "organizations"),
    where("userId", "==", userId),
  );
  return onSnapshot(q, (querySnapshot) => {
    const organizations = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Organization[];

    // Sort by creation date in JavaScript instead of Firestore
    const sortedOrganizations = organizations.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    callback(sortedOrganizations);
  });
};

// Time Entries
export const createTimeEntry = async (
  timeEntry: Omit<TimeEntry, "id" | "createdAt" | "updatedAt">,
) => {
  const docRef = await addDoc(collection(db, "timeEntries"), {
    ...timeEntry,
    startTime: Timestamp.fromDate(timeEntry.startTime),
    endTime: timeEntry.endTime ? Timestamp.fromDate(timeEntry.endTime) : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

export const updateTimeEntry = async (
  id: string,
  updates: Partial<TimeEntry>,
) => {
  const docRef = doc(db, "timeEntries", id);
  const updateData: any = {
    ...updates,
    updatedAt: serverTimestamp(),
  };

  if (updates.startTime) {
    updateData.startTime = Timestamp.fromDate(updates.startTime);
  }
  if (updates.endTime) {
    updateData.endTime = Timestamp.fromDate(updates.endTime);
  }

  await updateDoc(docRef, updateData);
};

export const deleteTimeEntry = async (id: string) => {
  const docRef = doc(db, "timeEntries", id);
  await deleteDoc(docRef);
};

export const getTimeEntries = async (userId: string): Promise<TimeEntry[]> => {
  const q = query(collection(db, "timeEntries"), where("userId", "==", userId));
  const querySnapshot = await getDocs(q);
  const timeEntries = querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    startTime: doc.data().startTime?.toDate() || new Date(),
    endTime: doc.data().endTime?.toDate() || undefined,
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  })) as TimeEntry[];

  // Sort by start time in JavaScript instead of Firestore
  return timeEntries.sort(
    (a, b) => b.startTime.getTime() - a.startTime.getTime(),
  );
};

export const getActiveTimeEntry = async (
  userId: string,
): Promise<TimeEntry | null> => {
  const q = query(
    collection(db, "timeEntries"),
    where("userId", "==", userId),
    where("isActive", "==", true),
  );
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return null;

  const doc = querySnapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
    startTime: doc.data().startTime?.toDate() || new Date(),
    endTime: doc.data().endTime?.toDate() || undefined,
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  } as TimeEntry;
};

export const subscribeToTimeEntries = (
  userId: string,
  callback: (timeEntries: TimeEntry[]) => void,
) => {
  const q = query(collection(db, "timeEntries"), where("userId", "==", userId));
  return onSnapshot(q, (querySnapshot) => {
    const timeEntries = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      startTime: doc.data().startTime?.toDate() || new Date(),
      endTime: doc.data().endTime?.toDate() || undefined,
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as TimeEntry[];

    // Sort by start time in JavaScript instead of Firestore
    const sortedTimeEntries = timeEntries.sort(
      (a, b) => b.startTime.getTime() - a.startTime.getTime(),
    );
    callback(sortedTimeEntries);
  });
};

export const subscribeToActiveTimeEntry = (
  userId: string,
  callback: (timeEntry: TimeEntry | null) => void,
) => {
  const q = query(
    collection(db, "timeEntries"),
    where("userId", "==", userId),
    where("isActive", "==", true),
  );
  return onSnapshot(q, (querySnapshot) => {
    if (querySnapshot.empty) {
      callback(null);
      return;
    }

    const doc = querySnapshot.docs[0];
    const timeEntry = {
      id: doc.id,
      ...doc.data(),
      startTime: doc.data().startTime?.toDate() || new Date(),
      endTime: doc.data().endTime?.toDate() || undefined,
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    } as TimeEntry;
    callback(timeEntry);
  });
};
