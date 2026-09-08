import SwiftUI

struct ContentView: View {
    @StateObject private var store = FirebaseTimeTrackerStore()
    @State private var presentedSheet: DashboardSheet?
    @State private var selectedTab: AppTab = .focus

    var body: some View {
        Group {
            if store.isRestoringSession {
                ProgressView("Restoring your session…")
            } else if store.user != nil {
                tracker
            } else {
                AuthenticationView(store: store)
            }
        }
        .alert("Something went wrong", isPresented: Binding(
            get: { store.errorMessage != nil },
            set: { if !$0 { store.errorMessage = nil } }
        )) {
            Button("OK", role: .cancel) { store.errorMessage = nil }
        } message: {
            Text(store.errorMessage ?? "Please try again.")
        }
    }

    private var tracker: some View {
        ZStack(alignment: .bottomTrailing) {
            TabView(selection: $selectedTab) {
                NavigationStack {
                    DashboardView(
                        projects: presentationProjects,
                        runningProjectID: store.activeTimeEntry?.projectId,
                        startedAt: store.activeTimeEntry?.startTime,
                        carriedSeconds: 0,
                        onToggleTimer: toggleTimer(for:),
                        onOpenProfile: { presentedSheet = .profile }
                    )
                }
                .tabItem { Label("Focus", systemImage: "timer") }
                .tag(AppTab.focus)

                NavigationStack {
                    ProjectsView(
                        projects: presentationProjects,
                        runningProjectID: store.activeTimeEntry?.projectId,
                        onSelect: { project in
                            if store.activeTimeEntry?.projectId != project.id { toggleTimer(for: project) }
                            selectedTab = .focus
                        },
                        onToggleTimer: toggleTimer(for:),
                        onCreate: { presentedSheet = .newProject }
                    )
                }
                .tabItem { Label("Projects", systemImage: "square.grid.2x2") }
                .tag(AppTab.projects)

                NavigationStack { TimeEntriesView(projects: presentationProjects) }
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
            .accessibilityLabel("Start a focus session")
            .padding(.trailing, 18)
            .padding(.bottom, 64)
        }
        .tint(.brandNavy)
        .sheet(item: $presentedSheet) { sheet in
            switch sheet {
            case .newProject:
                NewProjectSheet { name, color in
                    Task { await store.createProject(name: name, color: color) }
                    presentedSheet = nil
                }
            case .quickStart:
                QuickStartSheet(projects: presentationProjects) { project in
                    if store.activeTimeEntry?.projectId != project.id { toggleTimer(for: project) }
                    selectedTab = .focus
                    presentedSheet = nil
                }
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
            case .profile:
                ProfileView(onSignOut: { Task { await store.signOut() } })
                    .presentationDetents([.medium])
                    .presentationDragIndicator(.visible)
            }
        }
    }

    private var presentationProjects: [TTProject] {
        store.projects.map { project in
            let sessions = store.timeEntries.compactMap { entry -> TTSession? in
                guard entry.projectId == project.id, let endTime = entry.endTime else { return nil }
                return TTSession(id: entry.id, date: endTime, duration: endTime.timeIntervalSince(entry.startTime))
            }
            return TTProject(
                id: project.id,
                name: project.name,
                accentColor: Color(hex: project.color) ?? .brandBlue,
                sessions: sessions
            )
        }
    }

    private func toggleTimer(for project: TTProject) {
        Task { await store.toggleTimer(for: project.id) }
    }
}

enum AppTab: Hashable { case focus, projects, history }

enum DashboardSheet: String, Identifiable {
    case newProject
    case quickStart
    case profile
    var id: String { rawValue }
}

private struct NewProjectSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var color = "#136099"
    let onSave: (String, String) -> Void

    var body: some View {
        NavigationStack {
            Form {
                TextField("Project name", text: $name)
                TextField("Color (#RRGGBB)", text: $color)
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
            }
            .navigationTitle("New Project")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { onSave(name, color) }
                        .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || Color(hex: color) == nil)
                }
            }
        }
    }
}

private struct QuickStartSheet: View {
    let projects: [TTProject]
    let onSelect: (TTProject) -> Void

    var body: some View {
        NavigationStack {
            List(projects) { project in
                Button { onSelect(project) } label: {
                    HStack(spacing: 14) {
                        Circle().fill(project.accentColor).frame(width: 11, height: 11)
                        Text(project.name).foregroundStyle(.primary)
                    }
                    .padding(.vertical, 7)
                }
            }
            .overlay {
                if projects.isEmpty {
                    ContentUnavailableView("No projects yet", systemImage: "square.grid.2x2")
                }
            }
            .navigationTitle("Start a focus session")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

#Preview { ContentView() }
