//
//  Pinned.swift
//  time-tracker
//
//  Created by Ammar Razzak on 5/31/26.
//

import SwiftUI
#if canImport(UIKit)
import UIKit
#elseif canImport(AppKit)
import AppKit
#endif

// MARK: - Models (internal so TimeEntriesView can use them)

struct TTSession: Identifiable {
    let id = UUID()
    let date: Date
    let duration: TimeInterval  // seconds
}

struct TTProject: Identifiable, Hashable {
    let id = UUID()
    let name: String
    let accentColor: Color
    let sessions: [TTSession]

    func hash(into hasher: inout Hasher) { hasher.combine(id) }
    static func == (lhs: TTProject, rhs: TTProject) -> Bool { lhs.id == rhs.id }
}

struct TTFolder: Identifiable, Hashable {
    let id = UUID()
    var name: String
    var isExpanded: Bool = true
    var projects: [TTProject]
}

// MARK: - Pastel palette

extension Color {
    /// Brand palette anchored to #001427.
    static let brandNavy      = Color(red: 0.000, green: 0.078, blue: 0.153)
    static let brandBlueDeep  = Color(red: 0.035, green: 0.220, blue: 0.373)
    static let brandBlue      = Color(red: 0.075, green: 0.365, blue: 0.600)
    static let brandBlueLight = Color(red: 0.300, green: 0.590, blue: 0.800)
    static let brandBluePale  = Color(red: 0.720, green: 0.835, blue: 0.920)
    static let pastelMint     = Color(hue: 0.47, saturation: 0.55, brightness: 0.92)
    static let pastelLavender = Color(hue: 0.75, saturation: 0.50, brightness: 0.95)
    static let pastelPeach    = Color(hue: 0.07, saturation: 0.55, brightness: 0.98)
    static let pastelSky      = Color(hue: 0.60, saturation: 0.50, brightness: 0.95)
    #if canImport(UIKit)
    static let appBackground = Color(uiColor: UIColor.systemBackground)
    static let secondaryBackground = Color(uiColor: UIColor.secondarySystemBackground)
    static let tertiaryBackground = Color(uiColor: UIColor.tertiarySystemBackground)
    #elseif canImport(AppKit)
    static let appBackground = Color(nsColor: NSColor.windowBackgroundColor)
    static let secondaryBackground = Color(nsColor: NSColor.controlBackgroundColor)
    static let tertiaryBackground = Color(nsColor: NSColor.underPageBackgroundColor)
    #endif
}

// MARK: - Sample data

func makeSessions(count: Int, spread: Int = 1) -> [TTSession] {
    let durations: [TimeInterval] = [2700, 5400, 3600, 1800, 7200, 4500, 900, 6300]
    let calendar = Calendar.current
    return (0..<count).map { i in
        let date = calendar.date(byAdding: .day, value: -(i * spread), to: Date()) ?? Date()
        return TTSession(date: date, duration: durations[i % durations.count])
    }
}

// MARK: - Sidebar destination

enum SidebarDestination: Hashable {
    case home
    case project(TTProject.ID)
    case timeEntries
}

// MARK: - Main View

struct PinnedView: View {
    @State private var pinnedProjects: [TTProject] = [
        TTProject(name: "iOS App",          accentColor: .brandNavy,      sessions: makeSessions(count: 5, spread: 2)),
        TTProject(name: "Internal Tools",   accentColor: .brandBlueDeep,  sessions: makeSessions(count: 4, spread: 4)),
    ]

    @State private var folders: [TTFolder] = [
        TTFolder(name: "Clients", projects: [
            TTProject(name: "Marketing Site",   accentColor: .brandBlue,      sessions: makeSessions(count: 3, spread: 3)),
            TTProject(name: "Client Dashboard", accentColor: .brandBlueLight, sessions: makeSessions(count: 6, spread: 1)),
        ])
    ]

    var allProjects: [TTProject] {
        pinnedProjects + folders.flatMap(\.projects)
    }

    @State private var destination: SidebarDestination = .home
    @State private var runningProjectID: TTProject.ID?
    @State private var startedAt: Date?
    @State private var carriedSeconds: TimeInterval = 0

    var body: some View {
        NavigationSplitView {
            sidebarContent
        } detail: {
            detailContent
                .toolbar {
                    if destination != .home {
                        ToolbarItem(placement: .navigation) {
                            Button {
                                withAnimation { destination = .home }
                            } label: {
                                Label("Home", systemImage: "house")
                            }
                            .help("Go to Home")
                        }
                    }
                }
        }
    }

    // MARK: Sidebar

    private var sidebarContent: some View {
        List(selection: Binding<SidebarDestination?>(
            get: { destination },
            set: { if let v = $0 { destination = v } }
        )) {
            SwiftUI.Section {
                Label("Home", systemImage: "house")
                    .tag(SidebarDestination.home)
            }

            SwiftUI.Section {
                ForEach(pinnedProjects) { project in
                    projectSidebarRow(project)
                }
                .onMove { source, destination in
                    pinnedProjects.move(fromOffsets: source, toOffset: destination)
                }
            } header: {
                Label("Pinned", systemImage: "pin.fill")
            }

            if !folders.isEmpty {
                ForEach($folders) { $folder in
                    SwiftUI.Section(isExpanded: $folder.isExpanded) {
                        ForEach(folder.projects) { project in
                            projectSidebarRow(project)
                        }
                        .onMove { source, destination in
                            folder.projects.move(fromOffsets: source, toOffset: destination)
                        }
                    } header: {
                        Text(folder.name)
                    }
                }
                .onMove { source, destination in
                    folders.move(fromOffsets: source, toOffset: destination)
                }
            }

            SwiftUI.Section {
                Label("Time Entries", systemImage: "chart.pie.fill")
                    .tag(SidebarDestination.timeEntries)
            }
        }
        .listStyle(.sidebar)
        .navigationTitle("Time Tracker")
        .safeAreaInset(edge: .bottom) {
            Button {
                withAnimation {
                    folders.append(TTFolder(name: "New Folder", projects: []))
                }
            } label: {
                Label("New Folder", systemImage: "folder.badge.plus")
                    .font(.callout)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
            }
            .buttonStyle(.plain)
            .foregroundStyle(.secondary)
        }
    }

    @ViewBuilder
    private func projectSidebarRow(_ project: TTProject) -> some View {
        HStack(spacing: 10) {
            Circle()
                .fill(project.accentColor)
                .frame(width: 9, height: 9)
            Text(project.name)
            Spacer()
            if runningProjectID == project.id {
                TimelineView(.periodic(from: .now, by: 1)) { _ in
                    Text(sidebarFormattedTime(elapsedSeconds))
                        .font(.caption.monospacedDigit())
                        .foregroundStyle(.secondary)
                        .contentTransition(.numericText())
                }
            }
            Button {
                startStopwatch(for: project)
            } label: {
                Image(systemName: runningProjectID == project.id ? "stop.fill" : "play.fill")
                    .font(.caption2)
                    .foregroundStyle(runningProjectID == project.id ? .red : .secondary)
                    .contentTransition(.symbolEffect(.replace))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("\(runningProjectID == project.id ? "Stop" : "Start") timer for \(project.name)")
        }
        .tag(SidebarDestination.project(project.id))
    }

    // MARK: Detail

    @ViewBuilder
    private var detailContent: some View {
        switch destination {
        case .home:
            homeScreen
        case .project(let id):
            if let project = allProjects.first(where: { $0.id == id }) {
                ProjectDetailView(
                    project: project,
                    runningProjectID: $runningProjectID,
                    startedAt: $startedAt,
                    carriedSeconds: $carriedSeconds,
                    onStartStop: { startStopwatch(for: project) }
                )
            } else {
                homeScreen
            }
        case .timeEntries:
            TimeEntriesView(projects: allProjects)
        }
    }

    private var homeScreen: some View {
        HomeView(
            projects: allProjects,
            runningProjectID: $runningProjectID,
            startedAt: $startedAt,
            carriedSeconds: $carriedSeconds,
            onNavigateToProject: { id in
                withAnimation { destination = .project(id) }
            },
            onStartStop: { project in
                startStopwatch(for: project)
            }
        )
    }

    // MARK: Helpers

    private var elapsedSeconds: TimeInterval {
        guard let startedAt else { return carriedSeconds }
        return carriedSeconds + Date().timeIntervalSince(startedAt)
    }

    private func sidebarFormattedTime(_ interval: TimeInterval) -> String {
        let totalSeconds = max(0, Int(interval))
        return String(format: "%02d:%02d:%02d", totalSeconds / 3_600, (totalSeconds % 3_600) / 60, totalSeconds % 60)
    }

    private func startStopwatch(for project: TTProject) {
        if runningProjectID == project.id {
            // Stopping – stay on the current screen
            carriedSeconds = elapsedSeconds
            startedAt = nil
            runningProjectID = nil
        } else {
            // Starting – stay on the current screen
            carriedSeconds = 0
            runningProjectID = project.id
            startedAt = Date()
        }
    }
}

// MARK: - Project Detail View

struct ProjectDetailView: View {
    let project: TTProject
    @Binding var runningProjectID: TTProject.ID?
    @Binding var startedAt: Date?
    @Binding var carriedSeconds: TimeInterval
    let onStartStop: () -> Void

    private var isRunning: Bool { runningProjectID == project.id }

    private var elapsedSeconds: TimeInterval {
        guard isRunning, let startedAt else { return carriedSeconds }
        return carriedSeconds + Date().timeIntervalSince(startedAt)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                headerCard
                sessionsSection
            }
            .padding(24)
        }
        .background(backgroundGradient)
    }

    // MARK: Background

    private var backgroundGradient: some View {
        Color.appBackground
            .ignoresSafeArea()
    }

    // MARK: Header Card

    private var headerCard: some View {
        ZStack(alignment: .bottomLeading) {
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(Color.secondaryBackground)
                .overlay(
                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                        .strokeBorder(Color.primary.opacity(0.08), lineWidth: 1)
                )

            VStack(alignment: .leading, spacing: 16) {
                HStack(alignment: .firstTextBaseline) {
                    Text(project.name)
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                        .foregroundStyle(.primary)

                    Spacer()

                    Circle()
                        .fill(isRunning ? Color.green : project.accentColor)
                        .frame(width: 11, height: 11)
                        .animation(.easeInOut(duration: 0.3), value: isRunning)
                }

                Divider()
                    .padding(.vertical, 2)

                TimelineView(.periodic(from: .now, by: 1)) { _ in
                    HStack(alignment: .center, spacing: 20) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(isRunning ? "Running" : "Paused")
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundStyle(isRunning ? .green : .secondary)
                                .textCase(.uppercase)
                                .tracking(0.8)

                            Text(formattedTime(elapsedSeconds))
                                .font(.system(size: 46, weight: .bold, design: .rounded))
                                .monospacedDigit()
                                .contentTransition(.numericText())
                                .foregroundStyle(.primary)
                        }

                        Spacer()

                        Button(action: onStartStop) {
                            ZStack {
                                Circle()
                                    .fill(
                                        isRunning
                                            ? AnyShapeStyle(Color.red.opacity(0.80))
                                            : AnyShapeStyle(project.accentColor.opacity(0.80))
                                    )
                                    .frame(width: 56, height: 56)

                                Image(systemName: isRunning ? "stop.fill" : "play.fill")
                                    .font(.system(size: 22, weight: .semibold))
                                    .foregroundStyle(.white)
                                    .contentTransition(.symbolEffect(.replace))
                            }
                        }
                        .buttonStyle(.plain)
                        .animation(.spring(response: 0.3, dampingFraction: 0.65), value: isRunning)
                    }
                }

                HStack(spacing: 12) {
                    statPill(icon: "clock.fill",    label: "Sessions", value: "\(project.sessions.count)")
                    statPill(icon: "sum",           label: "Total",    value: formattedTime(project.sessions.reduce(0) { $0 + $1.duration }))
                }
            }
            .padding(22)
        }
    }

    private func statPill(icon: String, label: String, value: String) -> some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundStyle(project.accentColor)
            VStack(alignment: .leading, spacing: 0) {
                Text(label)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .textCase(.uppercase)
                    .tracking(0.5)
                Text(value)
                    .font(.system(.subheadline, design: .rounded))
                    .fontWeight(.semibold)
                    .monospacedDigit()
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Color.secondaryBackground, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .strokeBorder(Color.primary.opacity(0.08), lineWidth: 0.75)
        )
    }

    // MARK: Sessions Section

    private var sessionsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Past Sessions")
                .font(.system(.headline, design: .rounded))
                .foregroundStyle(.secondary)
                .padding(.horizontal, 4)

            if project.sessions.isEmpty {
                Text("No sessions recorded yet.")
                    .foregroundStyle(.tertiary)
                    .padding()
            } else {
                VStack(spacing: 8) {
                    ForEach(Array(project.sessions.enumerated()), id: \.element.id) { index, session in
                        SessionRow(session: session, accentColor: project.accentColor, index: index)
                    }
                }
            }
        }
    }

    private func formattedTime(_ interval: TimeInterval) -> String {
        let s = Int(interval)
        return String(format: "%02d:%02d:%02d", s / 3600, (s % 3600) / 60, s % 60)
    }
}

// MARK: - Session Row

struct SessionRow: View {
    let session: TTSession
    let accentColor: Color
    let index: Int

    @State private var isHovered = false
    @State private var showingEdit = false

    private static let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .medium
        f.timeStyle = .short
        return f
    }()

    // MARK: Duration display

    private var totalMinutes: Int { max(1, Int(session.duration.rounded()) / 60) }
    private var hours: Int { totalMinutes / 60 }
    private var mins: Int { totalMinutes % 60 }

    @ViewBuilder
    private var durationBadge: some View {
        VStack(alignment: .center, spacing: 0) {
            if hours == 0 {
                // e.g. "30" big, "min" small
                Text("\(mins)")
                    .font(.system(size: 16, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(.primary)
                Text("min")
                    .font(.system(size: 9, weight: .semibold, design: .rounded))
                    .foregroundStyle(.secondary)
            } else if mins == 0 {
                // e.g. "1" big, "hr" small
                Text("\(hours)")
                    .font(.system(size: 16, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(.primary)
                Text("hr")
                    .font(.system(size: 9, weight: .semibold, design: .rounded))
                    .foregroundStyle(.secondary)
            } else {
                // e.g. "1hr" big, "25min" small
                Text("\(hours)hr")
                    .font(.system(size: 15, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(.primary)
                Text("\(mins)min")
                    .font(.system(size: 9, weight: .semibold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(.secondary)
            }
        }
        .frame(width: 46, height: 36, alignment: .center)
    }

    var body: some View {
        ZStack(alignment: .trailing) {
            HStack(alignment: .center, spacing: 14) {
                durationBadge

                VStack(alignment: .leading, spacing: 2) {
                    Text(Self.dateFormatter.string(from: session.date))
                        .font(.subheadline)
                        .fontWeight(.medium)
                }

                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .frame(maxWidth: .infinity)
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(Color.secondaryBackground)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(Color.primary.opacity(isHovered ? 0.04 : 0))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .strokeBorder(Color.primary.opacity(isHovered ? 0.12 : 0.07), lineWidth: 0.75)
            )

            // Hover-reveal edit button
            if isHovered {
                Button {
                    showingEdit = true
                } label: {
                    HStack(spacing: 5) {
                        Image(systemName: "pencil")
                            .font(.system(size: 11, weight: .medium))
                        Text("Edit")
                            .font(.system(size: 12, weight: .medium, design: .rounded))
                    }
                    .foregroundStyle(.primary)
                    .padding(.horizontal, 11)
                    .padding(.vertical, 6)
                    .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 8, style: .continuous)
                            .strokeBorder(Color.primary.opacity(0.10), lineWidth: 0.75)
                    )
                }
                .buttonStyle(.plain)
                .padding(.trailing, 12)
                .transition(.opacity.combined(with: .scale(scale: 0.9, anchor: .trailing)))
            }
        }
        .onHover { isHovered = $0 }
        .animation(.easeInOut(duration: 0.15), value: isHovered)
        .sheet(isPresented: $showingEdit) {
            SessionEditSheet(session: session)
        }
    }
}

// MARK: - Session Edit Sheet

struct SessionEditSheet: View {
    let session: TTSession
    @Environment(\.dismiss) private var dismiss

    // We derive start from date and duration; initialise editable state
    @State private var startTime: Date
    @State private var endTime: Date

    init(session: TTSession) {
        self.session = session
        let end = session.date
        let start = end.addingTimeInterval(-session.duration)
        _startTime = State(initialValue: start)
        _endTime   = State(initialValue: end)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("Edit Session")
                .font(.system(size: 18, weight: .bold, design: .rounded))

            VStack(spacing: 12) {
                LabeledContent("Start") {
                    DatePicker("", selection: $startTime, displayedComponents: [.date, .hourAndMinute])
                        .labelsHidden()
                }
                LabeledContent("End") {
                    DatePicker("", selection: $endTime, in: startTime..., displayedComponents: [.date, .hourAndMinute])
                        .labelsHidden()
                }
            }

            HStack {
                Spacer()
                Button("Cancel") { dismiss() }
                    .keyboardShortcut(.cancelAction)
                Button("Save") {
                    // TODO: Persist edits back through the data model
                    dismiss()
                }
                .keyboardShortcut(.defaultAction)
                .buttonStyle(.borderedProminent)
            }
        }
        .padding(24)
        .frame(minWidth: 320)
    }
}

// MARK: - Preview

#Preview {
    PinnedView()
}
