import {
  collection,
  deleteField,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  documentId,
  serverTimestamp,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "./firebase";
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
  await httpsCallable<{ projectId: string }, void>(functions, "trashProject")({
    projectId: id,
  });
};

export const restoreProject = async (id: string) => {
  await httpsCallable<{ projectId: string }, void>(functions, "restoreProject")({
    projectId: id,
  });
};

export const getProjects = async (userId: string): Promise<Project[]> => {
  const q = query(collection(db, "projects"), where("userId", "==", userId));
  const querySnapshot = await getDocs(q);
  const projects = querySnapshot.docs
    .map(projectFromSnapshot)
    .filter((project) => !project.deletedAt);

  // Sort by creation date in JavaScript instead of Firestore
  return projects.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};

export const subscribeToProjects = (
  userId: string,
  callback: (projects: Project[]) => void,
) => {
  const q = query(collection(db, "projects"), where("userId", "==", userId));
  return onSnapshot(q, (querySnapshot) => {
    const projects = querySnapshot.docs
      .map(projectFromSnapshot)
      .filter((project) => !project.deletedAt);

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
  // Do not pass `undefined` to Firestore: it is rejected by default and can
  // leave the caller believing an edit was saved. Explicitly clearing an
  // optional field removes it instead.
  const updateData: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (updates.startTime) {
    updateData.startTime = Timestamp.fromDate(updates.startTime);
  }
  if ("endTime" in updates) {
    updateData.endTime = updates.endTime
      ? Timestamp.fromDate(updates.endTime)
      : deleteField();
  }
  if ("description" in updates) {
    updateData.description = updates.description?.trim()
      ? updates.description.trim()
      : deleteField();
  }
  if ("isActive" in updates && typeof updates.isActive === "boolean") {
    updateData.isActive = updates.isActive;
  }
  if (updates.projectId) {
    updateData.projectId = updates.projectId;
  }

  await updateDoc(docRef, updateData);
};

export const deleteTimeEntry = async (id: string) => {
  await httpsCallable<{ entryId: string }, void>(functions, "trashTimeEntry")({
    entryId: id,
  });
};

export const restoreTimeEntry = async (id: string) => {
  await httpsCallable<{ entryId: string }, void>(functions, "restoreTimeEntry")({
    entryId: id,
  });
};

export const permanentlyDeleteTrash = async (
  type: "project" | "timeEntry",
  id: string,
) => {
  await httpsCallable<{ type: "project" | "timeEntry"; id: string }, void>(
    functions,
    "permanentlyDeleteTrash",
  )({ type, id });
};

export const getTimeEntries = async (userId: string): Promise<TimeEntry[]> => {
  const q = query(collection(db, "timeEntries"), where("userId", "==", userId));
  const querySnapshot = await getDocs(q);
  const timeEntries = querySnapshot.docs
    .map(timeEntryFromSnapshot)
    .filter((entry) => !entry.deletedAt);

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

  const entry = querySnapshot.docs.map(timeEntryFromSnapshot).find((item) => !item.deletedAt);
  return entry ?? null;
};

export const subscribeToTimeEntries = (
  userId: string,
  callback: (timeEntries: TimeEntry[]) => void,
  onError?: (error: Error) => void,
) => {
  const q = query(collection(db, "timeEntries"), where("userId", "==", userId));
  return onSnapshot(
    q,
    (querySnapshot) => {
      const timeEntries = querySnapshot.docs
        .map(timeEntryFromSnapshot)
        .filter((entry) => !entry.deletedAt);

      // Sort by start time in JavaScript instead of Firestore
      const sortedTimeEntries = timeEntries.sort(
        (a, b) => b.startTime.getTime() - a.startTime.getTime(),
      );
      callback(sortedTimeEntries);
    },
    onError,
  );
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

    callback(querySnapshot.docs.map(timeEntryFromSnapshot).find((entry) => !entry.deletedAt) ?? null);
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
  );
  return onSnapshot(q, (querySnapshot) => {
    if (querySnapshot.empty) {
      callback(null);
      return;
    }

    callback(querySnapshot.docs.map(timeEntryFromSnapshot).find((entry) => !entry.deletedAt) ?? null);
  });
};

export const subscribeToDeletedProjects = (
  userId: string,
  callback: (projects: Project[]) => void,
) => onSnapshot(query(collection(db, "projects"), where("userId", "==", userId)), (snapshot) => {
  callback(snapshot.docs.map(projectFromSnapshot).filter((project) => Boolean(project.deletedAt)));
});

export const subscribeToDeletedTimeEntries = (
  userId: string,
  callback: (entries: TimeEntry[]) => void,
) => onSnapshot(query(collection(db, "timeEntries"), where("userId", "==", userId)), (snapshot) => {
  callback(snapshot.docs.map(timeEntryFromSnapshot).filter((entry) => Boolean(entry.deletedAt)));
});

function projectFromSnapshot(snapshot: { id: string; data: () => Record<string, unknown> }): Project {
  const data = snapshot.data();
  return {
    ...data,
    id: snapshot.id,
    createdAt: (data.createdAt as Timestamp | undefined)?.toDate() || new Date(),
    updatedAt: (data.updatedAt as Timestamp | undefined)?.toDate() || new Date(),
    deletedAt: (data.deletedAt as Timestamp | undefined)?.toDate(),
    purgeAt: (data.purgeAt as Timestamp | undefined)?.toDate(),
  } as Project;
}

function timeEntryFromSnapshot(snapshot: { id: string; data: () => Record<string, unknown> }): TimeEntry {
  const data = snapshot.data();
  return {
    ...data,
    id: snapshot.id,
    startTime: (data.startTime as Timestamp | undefined)?.toDate() || new Date(),
    endTime: (data.endTime as Timestamp | undefined)?.toDate() || undefined,
    createdAt: (data.createdAt as Timestamp | undefined)?.toDate() || new Date(),
    updatedAt: (data.updatedAt as Timestamp | undefined)?.toDate() || new Date(),
    deletedAt: (data.deletedAt as Timestamp | undefined)?.toDate(),
    purgeAt: (data.purgeAt as Timestamp | undefined)?.toDate(),
  } as TimeEntry;
}
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
