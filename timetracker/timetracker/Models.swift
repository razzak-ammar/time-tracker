//
//  Models.swift
//  timetracker
//
//  Created by Ammar Razzak on 8/23/25.
//

import Foundation
import FirebaseFirestore

struct Project: Identifiable, Codable {
    let id: String
    let name: String
    let color: String
    let userId: String
    let isPinned: Bool
    let createdAt: Date
    let updatedAt: Date
    
    init(id: String, name: String, color: String, userId: String, isPinned: Bool = false, createdAt: Date = Date(), updatedAt: Date = Date()) {
        self.id = id
        self.name = name
        self.color = color
        self.userId = userId
        self.isPinned = isPinned
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

struct TimeEntry: Identifiable, Codable {
    let id: String
    let projectId: String
    let userId: String
    let startTime: Date
    let endTime: Date?
    let description: String?
    let isActive: Bool
    let createdAt: Date
    let updatedAt: Date
    
    init(id: String, projectId: String, userId: String, startTime: Date, endTime: Date? = nil, description: String? = nil, isActive: Bool = true, createdAt: Date = Date(), updatedAt: Date = Date()) {
        self.id = id
        self.projectId = projectId
        self.userId = userId
        self.startTime = startTime
        self.endTime = endTime
        self.description = description
        self.isActive = isActive
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

struct TimeEntryWithProject: Identifiable {
    let id: String
    let projectId: String
    let userId: String
    let startTime: Date
    let endTime: Date?
    let description: String?
    let isActive: Bool
    let createdAt: Date
    let updatedAt: Date
    let project: Project
    
    init(timeEntry: TimeEntry, project: Project) {
        self.id = timeEntry.id
        self.projectId = timeEntry.projectId
        self.userId = timeEntry.userId
        self.startTime = timeEntry.startTime
        self.endTime = timeEntry.endTime
        self.description = timeEntry.description
        self.isActive = timeEntry.isActive
        self.createdAt = timeEntry.createdAt
        self.updatedAt = timeEntry.updatedAt
        self.project = project
    }
}

struct UserProfile: Identifiable, Codable {
    let id: String
    let email: String
    let displayName: String?
    let createdAt: Date
    let updatedAt: Date
    
    init(id: String, email: String, displayName: String? = nil, createdAt: Date = Date(), updatedAt: Date = Date()) {
        self.id = id
        self.email = email
        self.displayName = displayName
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}
