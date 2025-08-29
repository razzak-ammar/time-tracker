//
//  ProjectsView.swift
//  timetracker
//
//  Created by Ammar Razzak on 8/23/25.
//

import SwiftUI

struct ProjectsView: View {
    @ObservedObject var viewModel: TimeTrackingViewModel
    @State private var showingNewProject = false
    @State private var searchText = ""
    
    var filteredProjects: [Project] {
        if searchText.isEmpty {
            return viewModel.projects
        } else {
            return viewModel.projects.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
        }
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            VStack(spacing: 24) {
                HStack {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Projects")
                            .font(.system(size: 32, weight: .bold, design: .rounded))
                            .foregroundStyle(Theme.textPrimary)
                        
                        Text("\(viewModel.projects.count) projects")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundStyle(Theme.textSecondary)
                    }
                    
                    Spacer()
                    
                    Button(action: { showingNewProject = true }) {
                        HStack(spacing: 8) {
                            Image(systemName: "plus")
                                .font(.system(size: 14, weight: .semibold))
                            Text("New Project")
                                .font(.system(size: 14, weight: .semibold))
                        }
                        .foregroundStyle(.white)
                        .padding(.horizontal, 20)
                        .padding(.vertical, 12)
                        .background(Theme.primaryGradient)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .shadow(color: Theme.primary.opacity(0.3), radius: 8, x: 0, y: 4)
                    }
                }
                
                // Search bar
                HStack(spacing: 12) {
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
                            Button(action: { showingNewProject = true }) {
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
                    LazyVGrid(columns: [
                        GridItem(.flexible()),
                        GridItem(.flexible()),
                        GridItem(.flexible())
                    ], spacing: 20) {
                        ForEach(filteredProjects) { project in
                            ProjectDetailCard(project: project, viewModel: viewModel)
                        }
                    }
                    .padding(24)
                }
            }
        }
        .background(Theme.backgroundGradient)
        .sheet(isPresented: $showingNewProject) {
            NewProjectView(viewModel: viewModel)
        }
    }
}

struct ProjectDetailCard: View {
    let project: Project
    @ObservedObject var viewModel: TimeTrackingViewModel
    @State private var showingEditProject = false
    @State private var showingDeleteAlert = false
    @State private var showingStopConfirmation = false
    
    var isCurrentlyTracking: Bool {
        viewModel.activeTimeEntry?.projectId == project.id
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            // Header
            HStack {
                ZStack {
                    Circle()
                        .fill(Color(hex: project.color))
                        .frame(width: 24, height: 24)
                        .shadow(color: Color(hex: project.color).opacity(0.3), radius: 4, x: 0, y: 2)
                }
                
                Spacer()
                
                Menu {
                    Button(action: { showingEditProject = true }) {
                        Label("Edit", systemImage: "pencil")
                    }
                    
                    Button(action: {
                        Task {
                            await viewModel.toggleProjectPin(project: project)
                        }
                    }) {
                        Label(project.isPinned ? "Unpin" : "Pin", systemImage: project.isPinned ? "pin.slash" : "pin")
                    }
                    
                    Divider()
                    
                    Button(action: { showingDeleteAlert = true }) {
                        Label("Delete", systemImage: "trash")
                    }
                    .foregroundStyle(Theme.error)
                } label: {
                    Image(systemName: "ellipsis.circle")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(Theme.textTertiary)
                }
            }
            
            // Project info
            VStack(alignment: .leading, spacing: 12) {
                Text(project.name)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(Theme.textPrimary)
                    .lineLimit(2)
                
                let timeEntries = viewModel.getTimeEntriesForProject(projectId: project.id)
                let totalTime = timeEntries.compactMap { $0.endTime }.reduce(0) { total, endTime in
                    if let timeEntry = timeEntries.first(where: { $0.endTime == endTime }) {
                        return total + endTime.timeIntervalSince(timeEntry.startTime)
                    }
                    return total
                }
                
                VStack(alignment: .leading, spacing: 6) {
                    HStack(spacing: 8) {
                        Image(systemName: "clock")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(Theme.textTertiary)
                        
                        Text("\(timeEntries.count) entries")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(Theme.textSecondary)
                    }
                    
                    if totalTime > 0 {
                        HStack(spacing: 8) {
                            Image(systemName: "timer")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(Theme.textTertiary)
                            
                            let hours = Int(totalTime) / 3600
                            let minutes = Int(totalTime) % 3600 / 60
                            Text(String(format: "%d:%02d total time", hours, minutes))
                                .font(.system(size: 14, weight: .medium))
                                .foregroundStyle(Theme.textSecondary)
                        }
                    }
                }
            }
            
            Spacer()
            
            // Status and action buttons
            VStack(spacing: 12) {
                // Active tracking indicator
                if isCurrentlyTracking {
                    HStack(spacing: 8) {
                        Circle()
                            .fill(Theme.primary)
                            .frame(width: 8, height: 8)
                        Text("Currently tracking")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(Theme.primary)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Theme.primary.opacity(0.1))
                    .clipShape(Capsule())
                }
                
                // Action button
                Button(action: {
                    if isCurrentlyTracking {
                        Task {
                            await viewModel.stopTracking()
                        }
                    } else if viewModel.activeTimeEntry != nil {
                        showingStopConfirmation = true
                    } else {
                        Task {
                            await viewModel.startTracking(projectId: project.id)
                        }
                    }
                }) {
                    HStack(spacing: 8) {
                        Image(systemName: isCurrentlyTracking ? "stop.fill" : "play.fill")
                            .font(.system(size: 14, weight: .semibold))
                        Text(isCurrentlyTracking ? "Stop Tracking" : "Start Tracking")
                            .font(.system(size: 14, weight: .semibold))
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 40)
                    .foregroundStyle(.white)
                    .background(isCurrentlyTracking ? Theme.errorGradient : Theme.primaryGradient)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .shadow(color: (isCurrentlyTracking ? Theme.error : Theme.primary).opacity(0.3), radius: 6, x: 0, y: 3)
                }
                .disabled(viewModel.isLoading)
                
                // Pinned indicator
                if project.isPinned {
                    HStack(spacing: 6) {
                        Image(systemName: "pin.fill")
                            .font(.system(size: 12, weight: .medium))
                        Text("Pinned")
                            .font(.system(size: 12, weight: .medium))
                    }
                    .foregroundStyle(Theme.warning)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Theme.warning.opacity(0.1))
                    .clipShape(Capsule())
                }
            }
        }
        .padding(24)
        .cardStyle()
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(isCurrentlyTracking ? Theme.primary : Theme.border, lineWidth: isCurrentlyTracking ? 2 : 1)
        )
        .sheet(isPresented: $showingEditProject) {
            EditProjectView(project: project, viewModel: viewModel)
        }
        .alert("Delete Project", isPresented: $showingDeleteAlert) {
            Button("Cancel", role: .cancel) { }
            Button("Delete", role: .destructive) {
                Task {
                    await viewModel.deleteProject(project)
                }
            }
        } message: {
            Text("Are you sure you want to delete '\(project.name)'? This action cannot be undone.")
        }
        .alert("Stop Current Session?", isPresented: $showingStopConfirmation) {
            Button("Cancel", role: .cancel) { }
            Button("Stop & Start New", role: .destructive) {
                Task {
                    await viewModel.stopTracking()
                    await viewModel.startTracking(projectId: project.id)
                }
            }
        } message: {
            Text("You have an active timer running. Do you want to stop it and start tracking this project instead?")
        }
    }
}

struct NewProjectView: View {
    @ObservedObject var viewModel: TimeTrackingViewModel
    @Environment(\.dismiss) private var dismiss
    
    @State private var name = ""
    @State private var selectedColor = "#007AFF"
    
    private let colors = [
        "#007AFF", "#34C759", "#FF9500", "#FF3B30",
        "#AF52DE", "#5856D6", "#FF2D92", "#5AC8FA",
        "#FFCC02", "#FF6B35", "#4CD964", "#FF6B6B"
    ]
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            VStack(spacing: 20) {
                HStack {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("New Project")
                            .font(.system(size: 28, weight: .bold))
                            .foregroundStyle(Theme.textPrimary)
                        
                        Text("Create a new project to start tracking time")
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
            }
            .padding(32)
            .background(Theme.cardGradient)
            .clipShape(RoundedRectangle(cornerRadius: 20))
            .shadow(color: Theme.cardShadow.color, radius: Theme.cardShadow.radius, x: Theme.cardShadow.x, y: Theme.cardShadow.y)
            .padding(.horizontal, 24)
            .padding(.top, 24)
            
            // Form
            VStack(spacing: 32) {
                VStack(alignment: .leading, spacing: 16) {
                    Text("Project Name")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(Theme.textPrimary)
                    
                    TextField("Enter project name", text: $name)
                        .textFieldStyle(ModernTextFieldStyle())
                        .font(.system(size: 16, weight: .medium))
                }
                
                VStack(alignment: .leading, spacing: 20) {
                    Text("Project Color")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(Theme.textPrimary)
                    
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 6), spacing: 16) {
                        ForEach(colors, id: \.self) { color in
                            Button(action: { selectedColor = color }) {
                                ZStack {
                                    Circle()
                                        .fill(Color(hex: color))
                                        .frame(width: 44, height: 44)
                                        .shadow(color: Color(hex: color).opacity(0.3), radius: 6, x: 0, y: 3)
                                    
                                    if selectedColor == color {
                                        Circle()
                                            .stroke(.white, lineWidth: 3)
                                            .frame(width: 44, height: 44)
                                        
                                        Image(systemName: "checkmark")
                                            .font(.system(size: 18, weight: .bold))
                                            .foregroundStyle(.white)
                                    }
                                }
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                
                Spacer()
                
                // Action buttons
                HStack(spacing: 16) {
                    Button(action: { dismiss() }) {
                        Text("Cancel")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(Theme.textPrimary)
                            .frame(maxWidth: .infinity)
                            .frame(height: 48)
                            .background(Theme.secondary)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Theme.border, lineWidth: 1)
                            )
                    }
                    .buttonStyle(.plain)
                    
                    Button(action: {
                        Task {
                            await viewModel.createProject(name: name, color: selectedColor)
                            dismiss()
                        }
                    }) {
                        Text("Create Project")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 48)
                            .background(name.isEmpty ? Theme.secondaryGradient : Theme.primaryGradient)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .shadow(color: name.isEmpty ? Color.clear : Theme.primary.opacity(0.3), radius: 8, x: 0, y: 4)
                    }
                    .buttonStyle(.plain)
                    .disabled(name.isEmpty || viewModel.isLoading)
                }
            }
            .padding(32)
        }
        .background(Theme.backgroundGradient)
        .frame(width: 500, height: 500)
    }
}

struct EditProjectView: View {
    let project: Project
    @ObservedObject var viewModel: TimeTrackingViewModel
    @Environment(\.dismiss) private var dismiss
    
    @State private var name: String
    @State private var selectedColor: String
    
    init(project: Project, viewModel: TimeTrackingViewModel) {
        self.project = project
        self.viewModel = viewModel
        self._name = State(initialValue: project.name)
        self._selectedColor = State(initialValue: project.color)
    }
    
    private let colors = [
        "#007AFF", "#34C759", "#FF9500", "#FF3B30",
        "#AF52DE", "#5856D6", "#FF2D92", "#5AC8FA",
        "#FFCC02", "#FF6B35", "#4CD964", "#FF8C42"
    ]
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            VStack(spacing: 20) {
                HStack {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Edit Project")
                            .font(.system(size: 28, weight: .bold))
                            .foregroundStyle(Theme.textPrimary)
                        
                        Text("Update your project details")
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
            }
            .padding(32)
            .background(Theme.cardGradient)
            .clipShape(RoundedRectangle(cornerRadius: 20))
            .shadow(color: Theme.cardShadow.color, radius: Theme.cardShadow.radius, x: Theme.cardShadow.x, y: Theme.cardShadow.y)
            .padding(.horizontal, 24)
            .padding(.top, 24)
            
            // Form
            VStack(spacing: 32) {
                VStack(alignment: .leading, spacing: 16) {
                    Text("Project Name")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(Theme.textPrimary)
                    
                    TextField("Enter project name", text: $name)
                        .textFieldStyle(ModernTextFieldStyle())
                        .font(.system(size: 16, weight: .medium))
                }
                
                VStack(alignment: .leading, spacing: 20) {
                    Text("Project Color")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(Theme.textPrimary)
                    
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 6), spacing: 16) {
                        ForEach(colors, id: \.self) { color in
                            Button(action: { selectedColor = color }) {
                                ZStack {
                                    Circle()
                                        .fill(Color(hex: color))
                                        .frame(width: 44, height: 44)
                                        .shadow(color: Color(hex: color).opacity(0.3), radius: 6, x: 0, y: 3)
                                    
                                    if selectedColor == color {
                                        Circle()
                                            .stroke(.white, lineWidth: 3)
                                            .frame(width: 44, height: 44)
                                        
                                        Image(systemName: "checkmark")
                                            .font(.system(size: 18, weight: .bold))
                                            .foregroundStyle(.white)
                                    }
                                }
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                
                Spacer()
                
                // Action buttons
                HStack(spacing: 16) {
                    Button(action: { dismiss() }) {
                        Text("Cancel")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(Theme.textPrimary)
                            .frame(maxWidth: .infinity)
                            .frame(height: 48)
                            .background(Theme.secondary)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Theme.border, lineWidth: 1)
                            )
                    }
                    .buttonStyle(.plain)
                    
                    Button(action: {
                        Task {
                            try await viewModel.firebaseService.updateProject(project.id, updates: [
                                "name": name,
                                "color": selectedColor
                            ])
                            dismiss()
                        }
                    }) {
                        Text("Save Changes")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 48)
                            .background(name.isEmpty ? Theme.secondaryGradient : Theme.primaryGradient)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .shadow(color: name.isEmpty ? Color.clear : Theme.primary.opacity(0.3), radius: 8, x: 0, y: 4)
                    }
                    .buttonStyle(.plain)
                    .disabled(name.isEmpty || viewModel.isLoading)
                }
            }
            .padding(32)
        }
        .background(Theme.backgroundGradient)
        .frame(width: 500, height: 500)
    }
}

#Preview {
    ProjectsView(viewModel: TimeTrackingViewModel())
        .environmentObject(TimeTrackingViewModel())
}
