//
//  DashboardView.swift
//  timetracker
//
//  Created by Ammar Razzak on 8/23/25.
//

import SwiftUI

struct DashboardView: View {
    @EnvironmentObject var viewModel: TimeTrackingViewModel
    @State private var selectedTab = 0
    @State private var showingNewProject = false
    
    var body: some View {
        NavigationSplitView {
            // Sidebar
            VStack(spacing: 0) {
                // Logo and user info
                VStack(spacing: 16) {
                    HStack(spacing: 12) {
                        ZStack {
                            Circle()
                                .fill(Theme.primaryGradient)
                                .frame(width: 40, height: 40)
                                .shadow(color: Theme.primary.opacity(0.3), radius: 8, x: 0, y: 4)
                            
                            Image(systemName: "clock")
                                .font(.system(size: 20, weight: .bold))
                                .foregroundStyle(.white)
                        }
                        
                        Text("TimeTracker")
                            .font(.system(size: 20, weight: .bold, design: .rounded))
                            .foregroundStyle(Theme.textPrimary)
                    }
                    
                    if let user = viewModel.currentUser {
                        Text(user.email ?? "Unknown User")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(Theme.textSecondary)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(Theme.secondary)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 20)
                
                // Navigation menu
                VStack(spacing: 8) {
                    Button(action: { selectedTab = 0 }) {
                        SidebarMenuItem(
                            icon: "house",
                            title: "Dashboard",
                            isSelected: selectedTab == 0
                        )
                    }
                    .buttonStyle(.plain)
                    
                    Button(action: { selectedTab = 1 }) {
                        SidebarMenuItem(
                            icon: "folder",
                            title: "Projects",
                            isSelected: selectedTab == 1
                        )
                    }
                    .buttonStyle(.plain)
                    
                    Button(action: { selectedTab = 2 }) {
                        SidebarMenuItem(
                            icon: "clock.arrow.circlepath",
                            title: "Time Entries",
                            isSelected: selectedTab == 2
                        )
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, 16)
                .padding(.top, 20)
                
                Spacer()
                
                // Sign out button
                Button(action: viewModel.signOut) {
                    HStack(spacing: 10) {
                        ZStack {
                            Circle()
                                .fill(Theme.error.opacity(0.1))
                                .frame(width: 32, height: 32)
                            
                            Image(systemName: "rectangle.portrait.and.arrow.right")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundStyle(Theme.error)
                        }
                        
                        Text("Sign Out")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(Theme.error)
                        
                        Spacer()
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .background(Theme.error.opacity(0.05))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Theme.error.opacity(0.2), lineWidth: 1)
                    )
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 16)
                .padding(.bottom, 20)
            }
            .frame(minWidth: 220)
            .background(Theme.backgroundGradient)
        } detail: {
            // Detail view
            Group {
                switch selectedTab {
                case 0:
                    DashboardDetailView(viewModel: viewModel)
                case 1:
                    ProjectsView(viewModel: viewModel)
                case 2:
                    TimeEntriesView(viewModel: viewModel)
                default:
                    DashboardDetailView(viewModel: viewModel)
                }
            }
        }
        .navigationSplitViewStyle(.balanced)
        .sheet(isPresented: $showingNewProject) {
            NewProjectView(viewModel: viewModel)
        }
        .toolbar {
            ToolbarItem(placement: .navigation) {
                Button(action: {
                    // Toggle sidebar visibility
                    NSApp.keyWindow?.firstResponder?.tryToPerform(#selector(NSSplitViewController.toggleSidebar(_:)), with: nil)
                }) {
                    Image(systemName: "sidebar.left")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(Theme.textSecondary)
                }
            }
        }
    }
}

struct DashboardDetailView: View {
    @ObservedObject var viewModel: TimeTrackingViewModel
    @State private var showingNewProject = false
    @State private var showingStopConfirmation = false
    @State private var projectToStart: Project?
    
    var pinnedProjects: [Project] {
        viewModel.getPinnedProjects()
    }
    
    var recentTimeEntries: [TimeEntry] {
        Array(viewModel.timeEntries.prefix(5))
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: 32) {
                // Active timer section
                if let activeTimeEntry = viewModel.activeTimeEntry,
                   let project = viewModel.projects.first(where: { $0.id == activeTimeEntry.projectId }) {
                    ActiveTimerView(timeEntry: activeTimeEntry, project: project, viewModel: viewModel)
                } else {
                    NoActiveTimerView(
                        viewModel: viewModel,
                        showingNewProject: $showingNewProject,
                        showingStopConfirmation: $showingStopConfirmation,
                        projectToStart: $projectToStart
                    )
                }
                
                // Pinned projects section
                if !pinnedProjects.isEmpty {
                    VStack(alignment: .leading, spacing: 20) {
                        HStack {
                            Text("Pinned Projects")
                                .font(.system(size: 24, weight: .bold))
                                .foregroundStyle(Theme.textPrimary)
                            
                            Spacer()
                            
                            Button(action: { showingNewProject = true }) {
                                HStack(spacing: 6) {
                                    Image(systemName: "plus")
                                        .font(.system(size: 14, weight: .semibold))
                                    Text("New Project")
                                        .font(.system(size: 14, weight: .semibold))
                                }
                                .foregroundStyle(.white)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                                .background(Theme.primaryGradient)
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                                .shadow(color: Theme.primary.opacity(0.3), radius: 6, x: 0, y: 3)
                            }
                        }
                        
                        LazyVGrid(columns: [
                            GridItem(.flexible()),
                            GridItem(.flexible())
                        ], spacing: 16) {
                            ForEach(pinnedProjects) { project in
                                PinnedProjectCard(
                                    project: project,
                                    viewModel: viewModel,
                                    showingStopConfirmation: $showingStopConfirmation,
                                    projectToStart: $projectToStart
                                )
                            }
                        }
                    }
                    .padding(24)
                    .cardStyle()
                }
                
                // Recent time entries section
                if !recentTimeEntries.isEmpty {
                    VStack(alignment: .leading, spacing: 20) {
                        Text("Recent Time Entries")
                            .font(.system(size: 24, weight: .bold))
                            .foregroundStyle(Theme.textPrimary)
                        
                        LazyVStack(spacing: 12) {
                            ForEach(recentTimeEntries) { timeEntry in
                                if let project = viewModel.projects.first(where: { $0.id == timeEntry.projectId }) {
                                    RecentTimeEntryCard(timeEntry: timeEntry, project: project)
                                }
                            }
                        }
                    }
                    .padding(24)
                    .cardStyle()
                }
            }
            .padding(24)
        }
        .background(Theme.backgroundGradient)
        .sheet(isPresented: $showingNewProject) {
            NewProjectView(viewModel: viewModel)
        }
        .alert("Stop Current Session?", isPresented: $showingStopConfirmation) {
            Button("Cancel", role: .cancel) { }
            Button("Stop & Start New", role: .destructive) {
                if let projectToStart = projectToStart {
                    Task {
                        await viewModel.stopTracking()
                        await viewModel.startTracking(projectId: projectToStart.id)
                    }
                }
            }
        } message: {
            Text("You have an active timer running. Do you want to stop it and start tracking this project instead?")
        }
    }
}

struct NoActiveTimerView: View {
    @ObservedObject var viewModel: TimeTrackingViewModel
    @Binding var showingNewProject: Bool
    @Binding var showingStopConfirmation: Bool
    @Binding var projectToStart: Project?
    @State private var showingProjectSelection = false
    
    var body: some View {
        VStack(spacing: 24) {
            // Icon and title
            VStack(spacing: 16) {
                ZStack {
                    Circle()
                        .fill(Theme.primary.opacity(0.1))
                        .frame(width: 120, height: 120)
                    
                    Image(systemName: "clock")
                        .font(.system(size: 48, weight: .medium))
                        .foregroundStyle(Theme.primary)
                }
                
                VStack(spacing: 8) {
                    Text("No Active Timer")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundStyle(Theme.textPrimary)
                    
                    Text("Start tracking time for any of your projects")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(Theme.textSecondary)
                        .multilineTextAlignment(.center)
                }
            }
            
            // Start tracking button
            Button(action: {
                if viewModel.activeTimeEntry != nil {
                    // Show confirmation if there's an active timer
                    showingStopConfirmation = true
                } else {
                    // Show project selection
                    showingProjectSelection = true
                }
            }) {
                HStack(spacing: 16) {
                    ZStack {
                        Circle()
                            .fill(Theme.primaryGradient)
                            .frame(width: 48, height: 48)
                            .shadow(color: Theme.primary.opacity(0.3), radius: 8, x: 0, y: 4)
                        
                        Image(systemName: "play.fill")
                            .font(.system(size: 20, weight: .bold))
                            .foregroundStyle(.white)
                    }
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Start Tracking")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundStyle(Theme.textPrimary)
                        
                        Text("Begin your productivity journey")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(Theme.textSecondary)
                    }
                    
                    Spacer()
                    
                    Image(systemName: "arrow.right")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Theme.primary)
                }
                .padding(24)
                .background(Theme.cardGradient)
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Theme.border, lineWidth: 1)
                )
                .shadow(color: Theme.cardShadow.color, radius: Theme.cardShadow.radius, x: Theme.cardShadow.x, y: Theme.cardShadow.y)
            }
            .buttonStyle(.plain)
        }
        .padding(40)
        .cardStyle()
        .sheet(isPresented: $showingProjectSelection) {
            ProjectSelectionView(viewModel: viewModel)
        }
    }
}

struct ProjectSelectionView: View {
    @ObservedObject var viewModel: TimeTrackingViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var searchText = ""
    
    var filteredProjects: [Project] {
        if searchText.isEmpty {
            return viewModel.projects
        } else {
            return viewModel.projects.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
        }
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Header
                VStack(spacing: 20) {
                    HStack {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Select Project")
                                .font(.system(size: 24, weight: .bold))
                                .foregroundStyle(Theme.textPrimary)
                            
                            Text("Choose a project to start tracking")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundStyle(Theme.textSecondary)
                        }
                        
                        Spacer()
                        
                        Button(action: { dismiss() }) {
                            Image(systemName: "xmark.circle.fill")
                                .font(.system(size: 24, weight: .medium))
                                .foregroundStyle(Theme.textTertiary)
                        }
                        .buttonStyle(.plain)
                    }
                    
                    // Search bar
                    HStack(spacing: 10) {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundStyle(Theme.textTertiary)
                        
                        TextField("Search projects...", text: $searchText)
                            .textFieldStyle(.plain)
                            .font(.system(size: 16, weight: .medium))
                        
                        if !searchText.isEmpty {
                            Button(action: { searchText = "" }) {
                                Image(systemName: "xmark.circle.fill")
                                    .font(.system(size: 16, weight: .medium))
                                    .foregroundStyle(Theme.textTertiary)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .background(Theme.secondary)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Theme.border, lineWidth: 1)
                    )
                }
                .padding(24)
                .background(Theme.cardGradient)
                .clipShape(RoundedRectangle(cornerRadius: 20))
                .shadow(color: Theme.cardShadow.color, radius: Theme.cardShadow.radius, x: Theme.cardShadow.x, y: Theme.cardShadow.y)
                .padding(.horizontal, 24)
                .padding(.top, 24)
                
                // Projects list
                if filteredProjects.isEmpty {
                    VStack(spacing: 24) {
                        Spacer()
                        
                        VStack(spacing: 20) {
                            ZStack {
                                Circle()
                                    .fill(Theme.primary.opacity(0.1))
                                    .frame(width: 100, height: 100)
                                
                                Image(systemName: "folder")
                                    .font(.system(size: 40, weight: .medium))
                                    .foregroundStyle(Theme.primary)
                            }
                            
                            VStack(spacing: 8) {
                                Text(searchText.isEmpty ? "No Projects" : "No matching projects")
                                    .font(.system(size: 24, weight: .bold))
                                    .foregroundStyle(Theme.textPrimary)
                                
                                Text(searchText.isEmpty ? "Create your first project to start tracking time" : "Try adjusting your search terms")
                                    .font(.system(size: 16, weight: .medium))
                                    .foregroundStyle(Theme.textSecondary)
                                    .multilineTextAlignment(.center)
                            }
                            
                            if searchText.isEmpty {
                                Button(action: {
                                    dismiss()
                                    // This will be handled by the parent view
                                }) {
                                    HStack(spacing: 8) {
                                        Image(systemName: "plus")
                                            .font(.system(size: 16, weight: .semibold))
                                        Text("Create Project")
                                            .font(.system(size: 16, weight: .semibold))
                                    }
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, 24)
                                    .padding(.vertical, 14)
                                    .background(Theme.primaryGradient)
                                    .clipShape(RoundedRectangle(cornerRadius: 12))
                                    .shadow(color: Theme.primary.opacity(0.3), radius: 8, x: 0, y: 4)
                                }
                            }
                        }
                        .padding(40)
                        .cardStyle()
                        .padding(.horizontal, 24)
                        
                        Spacer()
                    }
                } else {
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(filteredProjects) { project in
                                ProjectSelectionCard(project: project, viewModel: viewModel) {
                                    dismiss()
                                }
                            }
                        }
                        .padding(24)
                    }
                }
            }
            .background(Theme.backgroundGradient)
        }
    }
}

struct ProjectSelectionCard: View {
    let project: Project
    @ObservedObject var viewModel: TimeTrackingViewModel
    let onStart: () -> Void
    
    var body: some View {
        Button(action: {
            Task {
                await viewModel.startTracking(projectId: project.id)
                onStart()
            }
        }) {
            HStack(spacing: 16) {
                                        ZStack {
                            Circle()
                                .fill(Color(hex: project.color))
                                .frame(width: 48, height: 48)
                                .shadow(color: Color(hex: project.color).opacity(0.3), radius: 6, x: 0, y: 3)
                    
                    Image(systemName: "play.fill")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundStyle(.white)
                }
                
                VStack(alignment: .leading, spacing: 6) {
                    Text(project.name)
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(Theme.textPrimary)
                        .lineLimit(1)
                    
                    let timeEntries = viewModel.getTimeEntriesForProject(projectId: project.id)
                    Text("\(timeEntries.count) entries")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(Theme.textSecondary)
                }
                
                Spacer()
                
                Image(systemName: "arrow.right")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Theme.textTertiary)
            }
            .padding(20)
            .background(Theme.cardGradient)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(Theme.border, lineWidth: 1)
            )
            .shadow(color: Theme.cardShadow.color, radius: Theme.cardShadow.radius, x: Theme.cardShadow.x, y: Theme.cardShadow.y)
        }
        .buttonStyle(.plain)
        .disabled(viewModel.isLoading)
    }
}

struct ActiveTimerView: View {
    let timeEntry: TimeEntry
    let project: Project
    @ObservedObject var viewModel: TimeTrackingViewModel
    
    var body: some View {
        VStack(spacing: 24) {
            // Project info and timer
            HStack(spacing: 20) {
                ZStack {
                    Circle()
                        .fill(Color(hex: project.color))
                        .frame(width: 80, height: 80)
                        .shadow(color: Color(hex: project.color).opacity(0.3), radius: 12, x: 0, y: 6)
                    
                    Image(systemName: "play.fill")
                        .font(.system(size: 32, weight: .bold))
                        .foregroundStyle(.white)
                }
                
                VStack(alignment: .leading, spacing: 8) {
                    Text("Currently Tracking")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(Theme.textSecondary)
                    
                    Text(project.name)
                        .font(.system(size: 28, weight: .bold))
                        .foregroundStyle(Theme.textPrimary)
                    
                    Text(viewModel.formattedElapsedTime)
                        .font(.system(size: 32, weight: .bold, design: .monospaced))
                        .foregroundStyle(Theme.primary)
                }
                
                Spacer()
                
                Button(action: {
                    Task {
                        await viewModel.stopTracking()
                    }
                }) {
                    HStack(spacing: 8) {
                        Image(systemName: "stop.fill")
                            .font(.system(size: 16, weight: .semibold))
                        Text("Stop")
                            .font(.system(size: 16, weight: .semibold))
                    }
                    .foregroundStyle(.white)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(Theme.errorGradient)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .shadow(color: Theme.error.opacity(0.3), radius: 8, x: 0, y: 4)
                }
            }
            
            // Description input
            VStack(alignment: .leading, spacing: 12) {
                Text("What are you working on?")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Theme.textPrimary)
                
                TextField("Add a description...", text: Binding(
                    get: { timeEntry.description ?? "" },
                    set: { newValue in
                        Task {
                            await viewModel.updateTimeEntryDescription(timeEntryId: timeEntry.id, description: newValue)
                        }
                    }
                ))
                .textFieldStyle(ModernTextFieldStyle())
            }
        }
        .padding(32)
        .cardStyle()
    }
}

struct PinnedProjectCard: View {
    let project: Project
    @ObservedObject var viewModel: TimeTrackingViewModel
    @Binding var showingStopConfirmation: Bool
    @Binding var projectToStart: Project?
    
    var isCurrentlyTracking: Bool {
        viewModel.activeTimeEntry?.projectId == project.id
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header
            HStack {
                ZStack {
                    Circle()
                        .fill(Color(hex: project.color))
                        .frame(width: 20, height: 20)
                        .shadow(color: Color(hex: project.color).opacity(0.3), radius: 3, x: 0, y: 2)
                }
                
                Text(project.name)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(Theme.textPrimary)
                    .lineLimit(1)
                
                Spacer()
                
                if isCurrentlyTracking {
                    HStack(spacing: 4) {
                        Circle()
                            .fill(Theme.primary)
                            .frame(width: 6, height: 6)
                        Text("Live")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(Theme.primary)
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Theme.primary.opacity(0.1))
                    .clipShape(Capsule())
                }
            }
            
            // Stats
            let timeEntries = viewModel.getTimeEntriesForProject(projectId: project.id)
            let totalTime = timeEntries.compactMap { $0.endTime }.reduce(0) { total, endTime in
                if let timeEntry = timeEntries.first(where: { $0.endTime == endTime }) {
                    return total + endTime.timeIntervalSince(timeEntry.startTime)
                }
                return total
            }
            
            HStack(spacing: 12) {
                HStack(spacing: 6) {
                    Image(systemName: "clock")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Theme.textTertiary)
                    Text("\(timeEntries.count) entries")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Theme.textSecondary)
                }
                
                if totalTime > 0 {
                    HStack(spacing: 6) {
                        Image(systemName: "timer")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(Theme.textTertiary)
                        let hours = Int(totalTime) / 3600
                        let minutes = Int(totalTime) % 3600 / 60
                        Text(String(format: "%d:%02d", hours, minutes))
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(Theme.textSecondary)
                    }
                }
            }
            
            // Action button
            Button(action: {
                if isCurrentlyTracking {
                    Task {
                        await viewModel.stopTracking()
                    }
                } else if viewModel.activeTimeEntry != nil {
                    projectToStart = project
                    showingStopConfirmation = true
                } else {
                    Task {
                        await viewModel.startTracking(projectId: project.id)
                    }
                }
            }) {
                HStack(spacing: 6) {
                    Image(systemName: isCurrentlyTracking ? "stop.fill" : "play.fill")
                        .font(.system(size: 12, weight: .semibold))
                    Text(isCurrentlyTracking ? "Stop" : "Start")
                        .font(.system(size: 12, weight: .semibold))
                }
                .frame(maxWidth: .infinity)
                .frame(height: 32)
                .foregroundStyle(.white)
                .background(isCurrentlyTracking ? Theme.errorGradient : Theme.primaryGradient)
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .shadow(color: (isCurrentlyTracking ? Theme.error : Theme.primary).opacity(0.3), radius: 4, x: 0, y: 2)
            }
            .disabled(viewModel.isLoading)
        }
        .padding(16)
        .background(Theme.secondary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(isCurrentlyTracking ? Theme.primary : Theme.border, lineWidth: isCurrentlyTracking ? 2 : 1)
        )
    }
}

struct RecentTimeEntryCard: View {
    let timeEntry: TimeEntry
    let project: Project
    
    var duration: TimeInterval {
        if let endTime = timeEntry.endTime {
            return endTime.timeIntervalSince(timeEntry.startTime)
        } else {
            return Date().timeIntervalSince(timeEntry.startTime)
        }
    }
    
    var formattedDuration: String {
        let hours = Int(duration) / 3600
        let minutes = Int(duration) % 3600 / 60
        
        if hours > 0 {
            return String(format: "%d:%02d", hours, minutes)
        } else {
            return String(format: "%d min", minutes)
        }
    }
    
    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(Color(hex: project.color))
                    .frame(width: 12, height: 12)
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text(project.name)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Theme.textPrimary)
                
                if let description = timeEntry.description, !description.isEmpty {
                    Text(description)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Theme.textSecondary)
                        .lineLimit(1)
                }
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 4) {
                Text(formattedDuration)
                    .font(.system(size: 14, weight: .bold, design: .monospaced))
                    .foregroundStyle(Theme.textPrimary)
                
                Text(timeEntry.startTime.formatted(date: .abbreviated, time: .omitted))
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(Theme.textTertiary)
            }
        }
        .padding(12)
        .background(Theme.secondary)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

struct SidebarMenuItem: View {
    let icon: String
    let title: String
    let isSelected: Bool
    
    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(isSelected ? .white : Theme.primary.opacity(0.1))
                    .frame(width: 32, height: 32)
                
                Image(systemName: icon)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(isSelected ? Theme.primary : Theme.textSecondary)
            }
            
            Text(title)
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(isSelected ? Theme.textPrimary : Theme.textSecondary)
            
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(isSelected ? Theme.primary.opacity(0.1) : Color.clear)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(isSelected ? Theme.primary : Color.clear, lineWidth: 1)
        )
    }
}

#Preview {
    DashboardView()
        .environmentObject(TimeTrackingViewModel())
}
