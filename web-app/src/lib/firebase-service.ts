import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  documentId,
  serverTimestamp,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  DailySummary,
  OverviewSummary,
  Project,
  ProjectSummary,
  TimeEntry,
} from "@/types";

// Projects
export const createProject = async (
  project: Omit<Project, "id" | "createdAt" | "updatedAt">,
) => {
  const docRef = await addDoc(collection(db, "projects"), {
    ...project,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

export const updateProject = async (id: string, updates: Partial<Project>) => {
  const docRef = doc(db, "projects", id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

export const deleteProject = async (id: string) => {
  const docRef = doc(db, "projects", id);
  await deleteDoc(docRef);
};

export const getProjects = async (userId: string): Promise<Project[]> => {
  const q = query(collection(db, "projects"), where("userId", "==", userId));
  const querySnapshot = await getDocs(q);
  const projects = querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  })) as Project[];

  // Sort by creation date in JavaScript instead of Firestore
  return projects.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};

export const subscribeToProjects = (
  userId: string,
  callback: (projects: Project[]) => void,
) => {
  const q = query(collection(db, "projects"), where("userId", "==", userId));
  return onSnapshot(q, (querySnapshot) => {
    const projects = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Project[];

    // Sort by creation date in JavaScript instead of Firestore
    const sortedProjects = projects.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    callback(sortedProjects);
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export const subscribeToMostRecentTimeEntry = (
  userId: string,
  callback: (timeEntry: TimeEntry | null) => void,
) => {
  const q = query(
    collection(db, "timeEntries"),
    where("userId", "==", userId),
    orderBy("startTime", "desc"),
    limit(1),
  );
  return onSnapshot(q, (querySnapshot) => {
    if (querySnapshot.empty) {
      callback(null);
      return;
    }

    const snapshot = querySnapshot.docs[0];
    callback({
      id: snapshot.id,
      ...snapshot.data(),
      startTime: snapshot.data().startTime?.toDate() || new Date(),
      endTime: snapshot.data().endTime?.toDate() || undefined,
      createdAt: snapshot.data().createdAt?.toDate() || new Date(),
      updatedAt: snapshot.data().updatedAt?.toDate() || new Date(),
    } as TimeEntry);
  });
};

export const subscribeToOverviewSummary = (
  userId: string,
  callback: (summary: OverviewSummary | null) => void,
) => onSnapshot(doc(db, "users", userId, "summaries", "overview"), (snapshot) => {
  if (!snapshot.exists()) {
    callback(null);
    return;
  }
  callback(snapshot.data() as OverviewSummary);
});

export const subscribeToDailySummaries = (
  userId: string,
  dateKeys: string[],
  callback: (summaries: DailySummary[]) => void,
) => {
  if (dateKeys.length === 0) {
    callback([]);
    return () => undefined;
  }

  const q = query(
    collection(db, "users", userId, "dailySummaries"),
    where(documentId(), "in", dateKeys),
  );
  return onSnapshot(q, (querySnapshot) => {
    callback(querySnapshot.docs.map((snapshot) => snapshot.data() as DailySummary));
  });
};

export const subscribeToProjectSummaries = (
  userId: string,
  callback: (summaries: ProjectSummary[]) => void,
) => onSnapshot(collection(db, "users", userId, "projectSummaries"), (querySnapshot) => {
  callback(querySnapshot.docs.map((snapshot) => snapshot.data() as ProjectSummary));
});
