//
//  time_trackerApp.swift
//  time-tracker
//
//  Created by Ammar Razzak on 5/31/26.
//

import SwiftUI
import SwiftData
import FirebaseCore

@main
struct time_trackerApp: App {
    init() {
        if Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil {
            FirebaseApp.configure()
        }
    }

    var sharedModelContainer: ModelContainer = {
        let schema = Schema([
            Item.self,
        ])
        let modelConfiguration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)

        do {
            return try ModelContainer(for: schema, configurations: [modelConfiguration])
        } catch {
            fatalError("Could not create ModelContainer: \(error)")
        }
    }()

    var body: some Scene {
        WindowGroup {
            if FirebaseApp.app() == nil {
                FirebaseSetupView()
            } else {
                ContentView()
                    .preferredColorScheme(.light)
            }
        }
        .modelContainer(sharedModelContainer)
    }
}

private struct FirebaseSetupView: View {
    var body: some View {
        ContentUnavailableView(
            "Firebase needs configuration",
            systemImage: "bolt.horizontal.circle",
            description: Text("Add the Firebase console's GoogleService-Info.plist to the app target, then run again.")
        )
    }
}
