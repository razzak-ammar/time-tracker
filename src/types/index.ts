export interface Organization {
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
  organizationId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeEntryWithOrganization extends TimeEntry {
  organization: Organization;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  createdAt: Date;
  updatedAt: Date;
}
