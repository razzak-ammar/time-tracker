import SwiftUI

struct ProjectsView: View {
    let projects: [TTProject]
    let runningProjectID: TTProject.ID?
    let onSelect: (TTProject) -> Void
    let onToggleTimer: (TTProject) -> Void

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(projects) { project in
                    HStack(spacing: 14) {
                        RoundedRectangle(cornerRadius: 14)
                            .fill(project.accentColor.opacity(0.18))
                            .frame(width: 48, height: 48)
                            .overlay {
                                Circle().fill(project.accentColor).frame(width: 11, height: 11)
                            }

                        Button { onSelect(project) } label: {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(project.name).font(.headline).foregroundStyle(.primary)
                                Text("\(project.sessions.count) sessions")
                                    .font(.caption).foregroundStyle(.secondary)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        .buttonStyle(.plain)

                        Button { onToggleTimer(project) } label: {
                            Image(systemName: runningProjectID == project.id ? "stop.fill" : "play.fill")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundStyle(runningProjectID == project.id ? Color.red : Color.brandNavy)
                                .frame(width: 42, height: 42)
                                .background(Color(uiColor: .secondarySystemGroupedBackground), in: Circle())
                        }
                        .accessibilityLabel(runningProjectID == project.id ? "Stop \(project.name)" : "Start \(project.name)")
                    }
                    .padding(16)
                    .background(.white, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
                }
            }
            .padding(20)
        }
        .background(Color(uiColor: .systemGroupedBackground))
        .navigationTitle("Projects")
    }
}

struct ProfileView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack(spacing: 18) {
                Image(systemName: "person.crop.circle.fill")
                    .font(.system(size: 72))
                    .foregroundStyle(Color.brandNavy)
                VStack(spacing: 4) {
                    Text("Your Profile").font(.title2.bold())
                    Text("Manage your account and focus preferences.")
                        .font(.subheadline).foregroundStyle(.secondary)
                }
                Spacer()
            }
            .padding(.top, 32)
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        }
    }
}
