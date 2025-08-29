//
//  timetrackerApp.swift
//  timetracker
//
//  Created by Ammar Razzak on 8/23/25.
//

import SwiftUI
import Firebase

@main
struct timetrackerApp: App {
    init() {
        FirebaseApp.configure()
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .frame(minWidth: 800, minHeight: 600)
        }
        .windowStyle(.hiddenTitleBar)
        .windowResizability(.contentSize)
    }
}
