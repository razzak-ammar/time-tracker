import SwiftUI

struct ContentView: View {
    @State private var projects: [TTProject] = [
        TTProject(name: "Product Design", accentColor: .brandNavy, sessions: makeSessions(count: 7)),
        TTProject(name: "Development", accentColor: .brandBlueDeep, sessions: makeSessions(count: 5, spread: 2)),
        TTProject(name: "Learning", accentColor: .brandBlue, sessions: makeSessions(count: 4, spread: 3)),
        TTProject(name: "Meetings", accentColor: .brandBlueLight, sessions: makeSessions(count: 3, spread: 4))
    ]
    @State private var selectedProjectID: TTProject.ID?
    @State private var runningProjectID: TTProject.ID?
    @State private var startedAt: Date?
    @State private var carriedSeconds: TimeInterval = 0
    @State private var presentedSheet: DashboardSheet?
    @State private var selectedTab: AppTab = .focus

    private var selectedProject: TTProject? {
        projects.first { $0.id == (selectedProjectID ?? projects.first?.id) }
    }

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            TabView(selection: $selectedTab) {
                NavigationStack {
                    DashboardView(
                        projects: projects,
                        selectedProject: selectedProject,
                        runningProjectID: runningProjectID,
                        startedAt: startedAt,
                        carriedSeconds: carriedSeconds,
                        onToggleTimer: toggleTimer,
                        onSelectProject: { selectedProjectID = $0.id },
                        onOpenProjects: { presentedSheet = .projects },
                        onOpenProfile: { presentedSheet = .profile }
                    )
                }
                .tabItem { Label("Focus", systemImage: "timer") }
                .tag(AppTab.focus)

                NavigationStack {
                    ProjectsView(
                        projects: projects,
                        runningProjectID: runningProjectID,
                        onSelect: { project in
                            selectedProjectID = project.id
                            selectedTab = .focus
                        },
                        onToggleTimer: toggleTimer
                    )
                }
                .tabItem { Label("Projects", systemImage: "square.grid.2x2") }
                .tag(AppTab.projects)

                NavigationStack { TimeEntriesView(projects: projects) }
                    .tabItem { Label("History", systemImage: "clock.arrow.circlepath") }
                    .tag(AppTab.history)
            }

            Button { presentedSheet = .quickStart } label: {
                Image(systemName: "plus")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 56, height: 56)
                    .background(Color.brandNavy, in: Circle())
                    .shadow(color: Color.brandNavy.opacity(0.28), radius: 12, y: 6)
            }
            .accessibilityLabel("Add")
            .padding(.trailing, 18)
            .padding(.bottom, 64)
        }
        .tint(.brandNavy)
        .sheet(item: $presentedSheet) { sheet in
            switch sheet {
            case .projects, .quickStart:
                ProjectPickerSheet(
                    title: sheet == .quickStart ? "Start a focus session" : "All Projects",
                    projects: projects,
                    runningProjectID: runningProjectID,
                    onSelect: { project in
                        selectedProjectID = project.id
                        selectedTab = .focus
                        if sheet == .quickStart, runningProjectID != project.id {
                            toggleTimer(project)
                        }
                        presentedSheet = nil
                    }
                )
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
            case .profile:
                ProfileView()
                    .presentationDetents([.medium])
                    .presentationDragIndicator(.visible)
            }
        }
        .onAppear { selectedProjectID = selectedProjectID ?? projects.first?.id }
    }

    private func toggleTimer(_ project: TTProject) {
        if runningProjectID == project.id {
            if let startedAt { carriedSeconds += Date().timeIntervalSince(startedAt) }
            self.startedAt = nil
            runningProjectID = nil
        } else {
            selectedProjectID = project.id
            carriedSeconds = 0
            runningProjectID = project.id
            startedAt = Date()
        }
    }
}

enum AppTab: Hashable { case focus, projects, history }

enum DashboardSheet: String, Identifiable {
    case projects
    case quickStart
    case profile
    var id: String { rawValue }
}

#Preview { ContentView() }
