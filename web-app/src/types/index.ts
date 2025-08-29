export interface Project {
  id: string;
  name: string;
  color: string;
  userId: string;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
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
