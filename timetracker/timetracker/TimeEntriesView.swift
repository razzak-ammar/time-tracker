//
//  TimeEntriesView.swift
//  timetracker
//
//  Created by Ammar Razzak on 8/23/25.
//

import SwiftUI

struct TimeEntriesView: View {
    @ObservedObject var viewModel: TimeTrackingViewModel
    @State private var searchText = ""
    @State private var selectedProjectFilter: String? = nil
    @State private var showingDateFilter = false
    @State private var selectedDateRange: DateRange = .allTime
    
    enum DateRange: String, CaseIterable {
        case today = "Today"
        case yesterday = "Yesterday"
        case thisWeek = "This Week"
        case lastWeek = "Last Week"
        case thisMonth = "This Month"
        case lastMonth = "Last Month"
        case allTime = "All Time"
        
        var dateInterval: DateInterval? {
            let calendar = Calendar.current
            let now = Date()
            
            switch self {
            case .today:
                return calendar.dateInterval(of: .day, for: now)
            case .yesterday:
                guard let yesterday = calendar.date(byAdding: .day, value: -1, to: now) else { return nil }
                return calendar.dateInterval(of: .day, for: yesterday)
            case .thisWeek:
                return calendar.dateInterval(of: .weekOfYear, for: now)
            case .lastWeek:
                guard let lastWeek = calendar.date(byAdding: .weekOfYear, value: -1, to: now) else { return nil }
                return calendar.dateInterval(of: .weekOfYear, for: lastWeek)
            case .thisMonth:
                return calendar.dateInterval(of: .month, for: now)
            case .lastMonth:
                guard let lastMonth = calendar.date(byAdding: .month, value: -1, to: now) else { return nil }
                return calendar.dateInterval(of: .month, for: lastMonth)
            case .allTime:
                return nil
            }
        }
    }
    
    var filteredTimeEntries: [TimeEntry] {
        var entries = viewModel.timeEntries
        
        // Filter by search text
        if !searchText.isEmpty {
            entries = entries.filter { entry in
                if let project = viewModel.projects.first(where: { $0.id == entry.projectId }) {
                    return project.name.localizedCaseInsensitiveContains(searchText) ||
                           (entry.description?.localizedCaseInsensitiveContains(searchText) ?? false)
                }
                return false
            }
        }
        
        // Filter by project
        if let selectedProjectFilter = selectedProjectFilter {
            entries = entries.filter { $0.projectId == selectedProjectFilter }
        }
        
        // Filter by date range
        if let dateInterval = selectedDateRange.dateInterval {
            entries = entries.filter { entry in
                dateInterval.contains(entry.startTime)
            }
        }
        
        return entries
    }
    
    var totalTime: TimeInterval {
        filteredTimeEntries.compactMap { $0.endTime }.reduce(0) { total, endTime in
            if let timeEntry = filteredTimeEntries.first(where: { $0.endTime == endTime }) {
                return total + endTime.timeIntervalSince(timeEntry.startTime)
            }
            return total
        }
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            VStack(spacing: 24) {
                HStack {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Time Entries")
                            .font(.system(size: 32, weight: .bold, design: .rounded))
                            .foregroundStyle(Theme.textPrimary)
                        
                        Text("\(filteredTimeEntries.count) entries")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundStyle(Theme.textSecondary)
                    }
                    
                    Spacer()
                    
                    // Date filter
                    Menu {
                        ForEach(DateRange.allCases, id: \.self) { range in
                            Button(range.rawValue) {
                                selectedDateRange = range
                            }
                        }
                    } label: {
                        HStack(spacing: 8) {
                            Text(selectedDateRange.rawValue)
                                .font(.system(size: 14, weight: .medium))
                            Image(systemName: "chevron.down")
                                .font(.system(size: 12, weight: .medium))
                        }
                        .foregroundStyle(Theme.textPrimary)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(Theme.secondary)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(Theme.border, lineWidth: 1)
                        )
                    }
                }
                
                // Search bar
                HStack(spacing: 10) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(Theme.textTertiary)
                    
                    TextField("Search entries...", text: $searchText)
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
                
                // Project filter
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        Button(action: { selectedProjectFilter = nil }) {
                            HStack(spacing: 4) {
                                Image(systemName: "folder")
                                    .font(.system(size: 11, weight: .medium))
                                Text("All")
                                    .font(.system(size: 12, weight: .medium))
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(selectedProjectFilter == nil ? Theme.primary : Theme.secondary)
                            .foregroundStyle(selectedProjectFilter == nil ? .white : Theme.textPrimary)
                            .clipShape(Capsule())
                            .overlay(
                                Capsule()
                                    .stroke(selectedProjectFilter == nil ? Color.clear : Theme.border, lineWidth: 1)
                            )
                        }
                        .buttonStyle(.plain)
                        
                        ForEach(viewModel.projects) { project in
                            Button(action: { selectedProjectFilter = project.id }) {
                                HStack(spacing: 4) {
                                    Circle()
                                        .fill(Color(hex: project.color))
                                        .frame(width: 6, height: 6)
                                    Text(project.name)
                                        .font(.system(size: 12, weight: .medium))
                                        .lineLimit(1)
                                }
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(selectedProjectFilter == project.id ? Theme.primary : Theme.secondary)
                                .foregroundStyle(selectedProjectFilter == project.id ? .white : Theme.textPrimary)
                                .clipShape(Capsule())
                                .overlay(
                                    Capsule()
                                        .stroke(selectedProjectFilter == project.id ? Color.clear : Theme.border, lineWidth: 1)
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 24)
                }
            }
            .padding(24)
            .background(Theme.cardGradient)
            .clipShape(RoundedRectangle(cornerRadius: 20))
            .shadow(color: Theme.cardShadow.color, radius: Theme.cardShadow.radius, x: Theme.cardShadow.x, y: Theme.cardShadow.y)
            .padding(.horizontal, 24)
            .padding(.top, 24)
            
            // Total time summary
            if !filteredTimeEntries.isEmpty {
                HStack {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Total Time")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(Theme.textSecondary)
                        
                        let hours = Int(totalTime) / 3600
                        let minutes = Int(totalTime) % 3600 / 60
                        Text(String(format: "%d:%02d", hours, minutes))
                            .font(.system(size: 28, weight: .bold, design: .monospaced))
                            .foregroundStyle(Theme.primary)
                    }
                    
                    Spacer()
                }
                .padding(.horizontal, 24)
                .padding(.top, 20)
            }
            
            // Time entries list
            if filteredTimeEntries.isEmpty {
                VStack(spacing: 24) {
                    Spacer()
                    
                    VStack(spacing: 20) {
                        ZStack {
                            Circle()
                                .fill(Theme.primary.opacity(0.1))
                                .frame(width: 100, height: 100)
                            
                            Image(systemName: "clock.arrow.circlepath")
                                .font(.system(size: 40, weight: .medium))
                                .foregroundStyle(Theme.primary)
                        }
                        
                        VStack(spacing: 8) {
                            Text("No Time Entries")
                                .font(.system(size: 24, weight: .bold))
                                .foregroundStyle(Theme.textPrimary)
                            
                            Text("Start tracking time to see your entries here")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundStyle(Theme.textSecondary)
                                .multilineTextAlignment(.center)
                        }
                    }
                    .padding(40)
                    .cardStyle()
                    .padding(.horizontal, 24)
                    
                    Spacer()
                }
            } else {
                ScrollView {
                    LazyVStack(spacing: 16) {
                        ForEach(filteredTimeEntries) { timeEntry in
                            if let project = viewModel.projects.first(where: { $0.id == timeEntry.projectId }) {
                                TimeEntryDetailCard(timeEntry: timeEntry, project: project, viewModel: viewModel)
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

struct TimeEntryDetailCard: View {
    let timeEntry: TimeEntry
    let project: Project
    @ObservedObject var viewModel: TimeTrackingViewModel
    @State private var showingEditDescription = false
    @State private var description: String
    
    init(timeEntry: TimeEntry, project: Project, viewModel: TimeTrackingViewModel) {
        self.timeEntry = timeEntry
        self.project = project
        self.viewModel = viewModel
        self._description = State(initialValue: timeEntry.description ?? "")
    }
    
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
        VStack(alignment: .leading, spacing: 20) {
            // Header
            HStack {
                HStack(spacing: 12) {
                    ZStack {
                        Circle()
                            .fill(Color(hex: project.color))
                            .frame(width: 16, height: 16)
                            .shadow(color: Color(hex: project.color).opacity(0.3), radius: 2, x: 0, y: 1)
                    }
                    
                    Text(project.name)
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(Theme.textPrimary)
                }
                
                Spacer()
                
                Menu {
                    Button(action: { showingEditDescription = true }) {
                        Label("Edit Description", systemImage: "pencil")
                    }
                    
                    if timeEntry.isActive {
                        Button(action: {
                            Task {
                                await viewModel.stopTracking()
                            }
                        }) {
                            Label("Stop Tracking", systemImage: "stop.fill")
                        }
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(Theme.textTertiary)
                }
            }
            
            // Time info
            HStack {
                VStack(alignment: .leading, spacing: 6) {
                    HStack(spacing: 6) {
                        Image(systemName: "play.circle")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(Theme.textTertiary)
                        Text("Started")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(Theme.textTertiary)
                    }
                    
                    Text(timeEntry.startTime.formatted(date: .abbreviated, time: .shortened))
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Theme.textPrimary)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 6) {
                    HStack(spacing: 6) {
                        Image(systemName: "timer")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(Theme.textTertiary)
                        Text("Duration")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(Theme.textTertiary)
                    }
                    
                    Text(formattedDuration)
                        .font(.system(size: 18, weight: .bold, design: .monospaced))
                        .foregroundStyle(timeEntry.isActive ? Theme.primary : Theme.textPrimary)
                }
            }
            
            // End time (if completed)
            if let endTime = timeEntry.endTime {
                HStack {
                    HStack(spacing: 6) {
                        Image(systemName: "stop.circle")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(Theme.textTertiary)
                        Text("Ended")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(Theme.textTertiary)
                    }
                    
                    Text(endTime.formatted(date: .abbreviated, time: .shortened))
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(Theme.textSecondary)
                    
                    Spacer()
                }
            }
            
            // Description
            if let description = timeEntry.description, !description.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    HStack(spacing: 6) {
                        Image(systemName: "text.quote")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(Theme.textTertiary)
                        Text("Description")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(Theme.textTertiary)
                    }
                    
                    Text(description)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(Theme.textSecondary)
                        .padding(12)
                        .background(Theme.secondary)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
            
            // Active indicator
            if timeEntry.isActive {
                HStack(spacing: 8) {
                    Image(systemName: "play.fill")
                        .font(.system(size: 12, weight: .semibold))
                    Text("Currently tracking")
                        .font(.system(size: 12, weight: .semibold))
                }
                .foregroundStyle(Theme.primary)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Theme.primary.opacity(0.1))
                .clipShape(Capsule())
            }
        }
        .padding(24)
        .cardStyle()
        .sheet(isPresented: $showingEditDescription) {
            EditDescriptionView(description: $description, timeEntry: timeEntry, viewModel: viewModel)
        }
    }
}

struct EditDescriptionView: View {
    @Binding var description: String
    let timeEntry: TimeEntry
    @ObservedObject var viewModel: TimeTrackingViewModel
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            VStack(spacing: 24) {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Description")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Theme.textPrimary)
                    
                    TextEditor(text: $description)
                        .frame(minHeight: 120)
                        .padding(12)
                        .background(Theme.secondary)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Theme.border, lineWidth: 1)
                        )
                        .font(.system(size: 16, weight: .medium))
                }
                
                Spacer()
            }
            .padding(32)
            .frame(width: 450, height: 300)
            .navigationTitle("Edit Description")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        Task {
                            await viewModel.updateTimeEntryDescription(timeEntryId: timeEntry.id, description: description)
                            dismiss()
                        }
                    }
                    .disabled(viewModel.isLoading)
                }
            }
        }
    }
}

#Preview {
    TimeEntriesView(viewModel: TimeTrackingViewModel())
        .environmentObject(TimeTrackingViewModel())
}
