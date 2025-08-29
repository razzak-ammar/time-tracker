//
//  ContentView.swift
//  timetracker
//
//  Created by Ammar Razzak on 8/23/25.
//

import SwiftUI
import FirebaseAuth

struct ContentView: View {
    @StateObject private var viewModel = TimeTrackingViewModel()
    
    var body: some View {
        Group {
            if viewModel.currentUser != nil {
                DashboardView()
                    .environmentObject(viewModel)
            } else {
                AuthView()
                    .environmentObject(viewModel)
            }
        }
        .onAppear {
            // Check if user is already signed in
            viewModel.currentUser = Auth.auth().currentUser
        }
    }
}

#Preview {
    ContentView()
}
