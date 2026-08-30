export interface Project {
  id: string;
  name: string;
  color: string;
  userId: string;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  /** Present only while the project can be recovered from Recently Deleted. */
  deletedAt?: Date;
  /** Firestore TTL removes the document after this time. */
  purgeAt?: Date;
  /** Connects a trashed project to the entries trashed with it. */
  deletionId?: string;
}

export interface TimeEntry {
  id: string;
  projectId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  purgeAt?: Date;
  deletionId?: string;
}

export interface TimeEntryWithProject extends TimeEntry {
  project: Project;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OverviewSummary {
  completedSessionCount: number;
  completedDurationSeconds: number;
  schemaVersion: number;
}

export interface DailySummary {
  dateKey: string;
  completedSessionCount: number;
  durationSeconds: number;
}

export interface ProjectSummary {
  projectId: string;
  completedSessionCount: number;
  completedDurationSeconds: number;
}
