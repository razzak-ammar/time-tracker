import FirebaseFirestore
import FirebaseFunctions
import Foundation

final class FirebaseService {
    private let db = Firestore.firestore()
    private let functions = Functions.functions()

    func observeProjects(userId: String, onChange: @escaping (Result<[FirebaseProject], Error>) -> Void) -> ListenerRegistration {
        db.collection("projects")
            .whereField("userId", isEqualTo: userId)
            .addSnapshotListener { snapshot, error in
                if let error { onChange(.failure(error)); return }
                let projects = (snapshot?.documents ?? [])
                    .compactMap(Self.project(from:))
                    .filter { $0.deletedAt == nil }
                    .sorted { $0.createdAt > $1.createdAt }
                onChange(.success(projects))
            }
    }

    func observeTimeEntries(userId: String, onChange: @escaping (Result<[FirebaseTimeEntry], Error>) -> Void) -> ListenerRegistration {
        db.collection("timeEntries")
            .whereField("userId", isEqualTo: userId)
            .addSnapshotListener { snapshot, error in
                if let error { onChange(.failure(error)); return }
                let entries = (snapshot?.documents ?? [])
                    .compactMap(Self.timeEntry(from:))
                    .filter { $0.deletedAt == nil }
                    .sorted { $0.startTime > $1.startTime }
                onChange(.success(entries))
            }
    }

    func createProject(name: String, color: String, userId: String) async throws {
        try await db.collection("projects").addDocument(data: [
            "name": name,
            "color": color,
            "userId": userId,
            "isPinned": false,
            "createdAt": FieldValue.serverTimestamp(),
            "updatedAt": FieldValue.serverTimestamp()
        ])
    }

    func updateProject(id: String, name: String? = nil, color: String? = nil, isPinned: Bool? = nil) async throws {
        var updates: [String: Any] = ["updatedAt": FieldValue.serverTimestamp()]
        if let name { updates["name"] = name }
        if let color { updates["color"] = color }
        if let isPinned { updates["isPinned"] = isPinned }
        try await db.collection("projects").document(id).updateData(updates)
    }

    func createTimeEntry(projectId: String, userId: String, startTime: Date, endTime: Date? = nil, description: String? = nil, isActive: Bool) async throws {
        var data: [String: Any] = [
            "projectId": projectId,
            "userId": userId,
            "startTime": Timestamp(date: startTime),
            "endTime": endTime.map(Timestamp.init(date:)) as Any,
            "isActive": isActive,
            "createdAt": FieldValue.serverTimestamp(),
            "updatedAt": FieldValue.serverTimestamp()
        ]
        if let description = description?.trimmingCharacters(in: .whitespacesAndNewlines), !description.isEmpty {
            data["description"] = description
        }
        try await db.collection("timeEntries").addDocument(data: data)
    }

    func stopTimeEntry(id: String, endTime: Date = .now) async throws {
        try await db.collection("timeEntries").document(id).updateData([
            "endTime": Timestamp(date: endTime),
            "isActive": false,
            "updatedAt": FieldValue.serverTimestamp()
        ])
    }

    func updateTimeEntry(id: String, startTime: Date? = nil, endTime: Date?? = nil, description: String?? = nil, isActive: Bool? = nil, projectId: String? = nil) async throws {
        var updates: [String: Any] = ["updatedAt": FieldValue.serverTimestamp()]
        if let startTime { updates["startTime"] = Timestamp(date: startTime) }
        if let endTime { updates["endTime"] = endTime.map(Timestamp.init(date:)) as Any }
        if let description { updates["description"] = description ?? FieldValue.delete() }
        if let isActive { updates["isActive"] = isActive }
        if let projectId { updates["projectId"] = projectId }
        try await db.collection("timeEntries").document(id).updateData(updates)
    }

    func trashProject(id: String) async throws { try await call("trashProject", data: ["projectId": id]) }
    func restoreProject(id: String) async throws { try await call("restoreProject", data: ["projectId": id]) }
    func trashTimeEntry(id: String) async throws { try await call("trashTimeEntry", data: ["entryId": id]) }
    func restoreTimeEntry(id: String) async throws { try await call("restoreTimeEntry", data: ["entryId": id]) }
    func permanentlyDeleteTrash(type: String, id: String) async throws { try await call("permanentlyDeleteTrash", data: ["type": type, "id": id]) }

    private func call(_ name: String, data: [String: Any]) async throws {
        _ = try await functions.httpsCallable(name).call(data)
    }

    nonisolated private static func project(from snapshot: QueryDocumentSnapshot) -> FirebaseProject? {
        let data = snapshot.data()
        guard let name = data["name"] as? String,
              let color = data["color"] as? String,
              let userId = data["userId"] as? String else { return nil }
        return FirebaseProject(
            id: snapshot.documentID, name: name, color: color, userId: userId,
            isPinned: data["isPinned"] as? Bool ?? false,
            createdAt: (data["createdAt"] as? Timestamp)?.dateValue() ?? .now,
            updatedAt: (data["updatedAt"] as? Timestamp)?.dateValue() ?? .now,
            deletedAt: (data["deletedAt"] as? Timestamp)?.dateValue()
        )
    }

    nonisolated private static func timeEntry(from snapshot: QueryDocumentSnapshot) -> FirebaseTimeEntry? {
        let data = snapshot.data()
        guard let projectId = data["projectId"] as? String,
              let userId = data["userId"] as? String,
              let startTime = (data["startTime"] as? Timestamp)?.dateValue(),
              let isActive = data["isActive"] as? Bool else { return nil }
        return FirebaseTimeEntry(
            id: snapshot.documentID, projectId: projectId, userId: userId, startTime: startTime,
            endTime: (data["endTime"] as? Timestamp)?.dateValue(), description: data["description"] as? String,
            isActive: isActive, createdAt: (data["createdAt"] as? Timestamp)?.dateValue() ?? .now,
            updatedAt: (data["updatedAt"] as? Timestamp)?.dateValue() ?? .now,
            deletedAt: (data["deletedAt"] as? Timestamp)?.dateValue()
        )
    }
}
