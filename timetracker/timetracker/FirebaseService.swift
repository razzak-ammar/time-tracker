//
//  FirebaseService.swift
//  timetracker
//
//  Created by Ammar Razzak on 8/23/25.
//

import Foundation
import FirebaseFirestore
import FirebaseAuth

class FirebaseService: ObservableObject {
    private let db = Firestore.firestore()
    
    // MARK: - Projects
    func createProject(_ project: Project) async throws -> String {
        let docRef = try await db.collection("projects").addDocument(data: [
            "name": project.name,
            "color": project.color,
            "userId": project.userId,
            "isPinned": project.isPinned,
            "createdAt": Timestamp(date: project.createdAt),
            "updatedAt": Timestamp(date: project.updatedAt)
        ])
        return docRef.documentID
    }
    
    func updateProject(_ id: String, updates: [String: Any]) async throws {
        try await db.collection("projects").document(id).updateData([
            "updatedAt": Timestamp(date: Date())
        ].merging(updates) { _, new in new })
    }
    
    func deleteProject(_ id: String) async throws {
        try await db.collection("projects").document(id).delete()
    }
    
    func subscribeToProjects(userId: String, completion: @escaping ([Project]) -> Void) -> ListenerRegistration {
        return db.collection("projects")
            .whereField("userId", isEqualTo: userId)
            .addSnapshotListener { snapshot, error in
                guard let documents = snapshot?.documents else {
                    print("Error fetching projects: \(error?.localizedDescription ?? "Unknown error")")
                    completion([])
                    return
                }
                
                let projects = documents.compactMap { document -> Project? in
                    let data = document.data()
                    return Project(
                        id: document.documentID,
                        name: data["name"] as? String ?? "",
                        color: data["color"] as? String ?? "#000000",
                        userId: data["userId"] as? String ?? "",
                        isPinned: data["isPinned"] as? Bool ?? false,
                        createdAt: (data["createdAt"] as? Timestamp)?.dateValue() ?? Date(),
                        updatedAt: (data["updatedAt"] as? Timestamp)?.dateValue() ?? Date()
                    )
                }
                
                let sortedProjects = projects.sorted { $0.createdAt > $1.createdAt }
                completion(sortedProjects)
            }
    }
    
    // MARK: - Time Entries
    func createTimeEntry(_ timeEntry: TimeEntry) async throws -> String {
        var data: [String: Any] = [
            "projectId": timeEntry.projectId,
            "userId": timeEntry.userId,
            "startTime": Timestamp(date: timeEntry.startTime),
            "isActive": timeEntry.isActive,
            "createdAt": Timestamp(date: timeEntry.createdAt),
            "updatedAt": Timestamp(date: timeEntry.updatedAt)
        ]
        
        if let endTime = timeEntry.endTime {
            data["endTime"] = Timestamp(date: endTime)
        }
        
        if let description = timeEntry.description {
            data["description"] = description
        }
        
        let docRef = try await db.collection("timeEntries").addDocument(data: data)
        return docRef.documentID
    }
    
    func updateTimeEntry(_ id: String, updates: [String: Any]) async throws {
        var updateData: [String: Any] = [
            "updatedAt": Timestamp(date: Date())
        ]
        
        for (key, value) in updates {
            if key == "startTime" || key == "endTime", let date = value as? Date {
                updateData[key] = Timestamp(date: date)
            } else {
                updateData[key] = value
            }
        }
        
        try await db.collection("timeEntries").document(id).updateData(updateData)
    }
    
    func deleteTimeEntry(_ id: String) async throws {
        try await db.collection("timeEntries").document(id).delete()
    }
    
    func subscribeToTimeEntries(userId: String, completion: @escaping ([TimeEntry]) -> Void) -> ListenerRegistration {
        return db.collection("timeEntries")
            .whereField("userId", isEqualTo: userId)
            .addSnapshotListener { snapshot, error in
                guard let documents = snapshot?.documents else {
                    print("Error fetching time entries: \(error?.localizedDescription ?? "Unknown error")")
                    completion([])
                    return
                }
                
                let timeEntries = documents.compactMap { document -> TimeEntry? in
                    let data = document.data()
                    return TimeEntry(
                        id: document.documentID,
                        projectId: data["projectId"] as? String ?? "",
                        userId: data["userId"] as? String ?? "",
                        startTime: (data["startTime"] as? Timestamp)?.dateValue() ?? Date(),
                        endTime: (data["endTime"] as? Timestamp)?.dateValue(),
                        description: data["description"] as? String,
                        isActive: data["isActive"] as? Bool ?? false,
                        createdAt: (data["createdAt"] as? Timestamp)?.dateValue() ?? Date(),
                        updatedAt: (data["updatedAt"] as? Timestamp)?.dateValue() ?? Date()
                    )
                }
                
                let sortedTimeEntries = timeEntries.sorted { $0.startTime > $1.startTime }
                completion(sortedTimeEntries)
            }
    }
    
    func subscribeToActiveTimeEntry(userId: String, completion: @escaping (TimeEntry?) -> Void) -> ListenerRegistration {
        return db.collection("timeEntries")
            .whereField("userId", isEqualTo: userId)
            .whereField("isActive", isEqualTo: true)
            .addSnapshotListener { snapshot, error in
                guard let documents = snapshot?.documents, !documents.isEmpty else {
                    completion(nil)
                    return
                }
                
                let document = documents[0]
                let data = document.data()
                
                let timeEntry = TimeEntry(
                    id: document.documentID,
                    projectId: data["projectId"] as? String ?? "",
                    userId: data["userId"] as? String ?? "",
                    startTime: (data["startTime"] as? Timestamp)?.dateValue() ?? Date(),
                    endTime: (data["endTime"] as? Timestamp)?.dateValue(),
                    description: data["description"] as? String,
                    isActive: data["isActive"] as? Bool ?? false,
                    createdAt: (data["createdAt"] as? Timestamp)?.dateValue() ?? Date(),
                    updatedAt: (data["updatedAt"] as? Timestamp)?.dateValue() ?? Date()
                )
                
                completion(timeEntry)
            }
    }
    
    // MARK: - Authentication
    func signIn(email: String, password: String) async throws -> User {
        let result = try await Auth.auth().signIn(withEmail: email, password: password)
        return result.user
    }
    
    func signUp(email: String, password: String) async throws -> User {
        let result = try await Auth.auth().createUser(withEmail: email, password: password)
        return result.user
    }
    
    func signOut() throws {
        try Auth.auth().signOut()
    }
    
    func getCurrentUser() -> User? {
        return Auth.auth().currentUser
    }
}
