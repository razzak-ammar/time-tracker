import Foundation
import SwiftUI

struct FirebaseProject: Identifiable, Equatable {
    let id: String
    let name: String
    let color: String
    let userId: String
    let isPinned: Bool
    let createdAt: Date
    let updatedAt: Date
    let deletedAt: Date?
}

struct FirebaseTimeEntry: Identifiable, Equatable {
    let id: String
    let projectId: String
    let userId: String
    let startTime: Date
    let endTime: Date?
    let description: String?
    let isActive: Bool
    let createdAt: Date
    let updatedAt: Date
    let deletedAt: Date?
}

extension Color {
    init?(hex: String) {
        let value = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        guard value.count == 7, value.first == "#", let rgb = UInt64(value.dropFirst(), radix: 16) else {
            return nil
        }
        self.init(
            red: Double((rgb >> 16) & 0xFF) / 255,
            green: Double((rgb >> 8) & 0xFF) / 255,
            blue: Double(rgb & 0xFF) / 255
        )
    }
}
