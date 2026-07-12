import SwiftUI

struct DashboardView: View {
    let projects: [TTProject]
    let selectedProject: TTProject?
    let runningProjectID: TTProject.ID?
    let startedAt: Date?
    let carriedSeconds: TimeInterval
    let onToggleTimer: (TTProject) -> Void
    let onSelectProject: (TTProject) -> Void
    let onOpenProjects: () -> Void
    let onOpenProfile: () -> Void

    @State private var period: DashboardPeriod = .today

    private var runningProject: TTProject? { projects.first { $0.id == runningProjectID } }
    private var displayedProject: TTProject? { runningProject ?? selectedProject }
    private var weeklyTotal: TimeInterval { projects.flatMap(\.sessions).reduce(0) { $0 + $1.duration } }
    private var maxProjectTotal: TimeInterval { max(projectTotals.map(\.total).max() ?? 1, 1) }
    private var projectTotals: [(project: TTProject, total: TimeInterval)] {
        projects.map { ($0, $0.sessions.reduce(0) { $0 + $1.duration }) }
    }

    var body: some View {
        ZStack {
            Color(uiColor: .systemGroupedBackground).ignoresSafeArea()

            ScrollView(showsIndicators: false) {
                VStack(spacing: 22) {
                    topBar
                    timerHero
                    // Activity reporting is intentionally hidden from the Focus screen for now.
                    // periodSelector
                    // activityCard
                    projectsCard
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 32)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
    }

    private var topBar: some View {
        HStack {
            Button(action: onOpenProjects) {
                HStack(spacing: 8) {
                    Image(systemName: "square.grid.2x2")
                    Text("All Projects")
                    Image(systemName: "chevron.down").font(.caption.bold()).foregroundStyle(.secondary)
                }
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.primary)
                .padding(.horizontal, 15)
                .frame(height: 46)
                .background(.white, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                .shadow(color: .black.opacity(0.05), radius: 12, y: 5)
            }
            .accessibilityLabel("Choose from all projects")
            Spacer()
            Button(action: onOpenProfile) {
                Image(systemName: "person.crop.circle")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(.primary)
                    .frame(width: 48, height: 48)
                    .background(.white, in: RoundedRectangle(cornerRadius: 17, style: .continuous))
                    .shadow(color: .black.opacity(0.05), radius: 12, y: 5)
            }
            .accessibilityLabel("Open profile")
        }
        .padding(.top, 8)
    }

    private var timerHero: some View {
        VStack(spacing: 14) {
            HStack(spacing: 7) {
                Circle().fill(runningProject == nil ? Color.secondary : .brandBlue).frame(width: 8, height: 8)
                Text(runningProject == nil ? "Ready to focus" : runningProject?.name ?? "Focus Session")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(.secondary)
            }

            TimelineView(.periodic(from: .now, by: 1)) { _ in
                Text(clockText)
                    .font(.system(size: 55, weight: .regular, design: .rounded))
                    .monospacedDigit()
                    .contentTransition(.numericText())
            }

            Button {
                if let displayedProject { onToggleTimer(displayedProject) }
            } label: {
                ZStack {
                    Circle().stroke(Color.brandBlue.opacity(0.22), lineWidth: 7).frame(width: 92, height: 92)
                    Circle().fill(Color.brandBluePale.opacity(0.42)).frame(width: 68, height: 68)
                    Image(systemName: runningProject == nil ? "play.fill" : "stop.fill")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundStyle(Color.brandNavy)
                        .contentTransition(.symbolEffect(.replace))
                }
            }
            .buttonStyle(.plain)
            .disabled(displayedProject == nil)
            .accessibilityLabel(runningProject == nil ? "Start timer" : "Stop timer")
        }
        .padding(.vertical, 4)
    }

    private var periodSelector: some View {
        HStack(spacing: 0) {
            ForEach(DashboardPeriod.allCases) { item in
                Button(item.rawValue) {
                    withAnimation(.snappy) { period = item }
                }
                .font(.subheadline.weight(period == item ? .semibold : .regular))
                .foregroundStyle(period == item ? .primary : .secondary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 11)
                .background(period == item ? Color.white : .clear, in: RoundedRectangle(cornerRadius: 12))
                .shadow(color: period == item ? .black.opacity(0.05) : .clear, radius: 6, y: 2)
            }
        }
        .padding(4)
        .background(Color.black.opacity(0.035), in: RoundedRectangle(cornerRadius: 16))
    }

    private var activityCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .firstTextBaseline) {
                Text(period == .today ? "Daily activity" : "Weekly activity").font(.headline)
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text(compactDuration(weeklyTotal)).font(.title3.bold()).monospacedDigit()
                    Text("this week").font(.caption).foregroundStyle(.secondary)
                }
            }

            HStack(alignment: .bottom, spacing: 12) {
                ForEach(weekData) { day in
                    VStack(spacing: 8) {
                        RoundedRectangle(cornerRadius: 6, style: .continuous)
                            .fill(day.isToday ? Color.brandNavy : Color.brandBluePale.opacity(0.65))
                            .frame(height: max(8, 78 * day.ratio))
                        Text(day.label).font(.caption2).foregroundStyle(day.isToday ? .primary : .secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .bottom)
                }
            }
            .frame(height: 108, alignment: .bottom)
        }
        .dashboardCard()
    }

    private var projectsCard: some View {
        VStack(spacing: 10) {
            HStack {
                Text("Projects").font(.headline)
                Spacer()
                Text("Total \(compactDuration(weeklyTotal))").font(.subheadline).foregroundStyle(.secondary)
            }
            .padding(.horizontal, 2)
            .padding(.bottom, 2)

            ForEach(projectTotals, id: \.project.id) { item in
                HStack(spacing: 12) {
                    Button { onSelectProject(item.project) } label: {
                        HStack(spacing: 12) {
                        Image(systemName: icon(for: item.project.name))
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(.primary.opacity(0.76))
                            .frame(width: 36, height: 36)
                            .background(item.project.accentColor.opacity(0.18), in: RoundedRectangle(cornerRadius: 11))
                        Text(item.project.name)
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.primary)
                            .lineLimit(1)
                        Spacer()
                        Text(compactDuration(item.total))
                            .font(.subheadline.weight(.medium))
                            .monospacedDigit()
                            .foregroundStyle(.secondary)
                        }
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)

                    Button { onToggleTimer(item.project) } label: {
                        Image(systemName: runningProjectID == item.project.id ? "stop.fill" : "play.fill")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundStyle(runningProjectID == item.project.id ? Color.red : Color.brandNavy)
                            .frame(width: 38, height: 38)
                            .background(
                                (runningProjectID == item.project.id ? Color.red : Color.brandBlue).opacity(0.10),
                                in: Circle()
                            )
                            .contentTransition(.symbolEffect(.replace))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(
                        runningProjectID == item.project.id
                            ? "Stop timer for \(item.project.name)"
                            : "Start timer for \(item.project.name)"
                    )
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 9)
                .background(.white, in: RoundedRectangle(cornerRadius: 17, style: .continuous))
                .shadow(color: .black.opacity(0.03), radius: 10, y: 4)
            }
        }
    }

    private var clockText: String {
        let elapsed = carriedSeconds + ((runningProject != nil && startedAt != nil) ? Date().timeIntervalSince(startedAt!) : 0)
        let seconds = max(0, Int(elapsed))
        return String(format: "%02d:%02d:%02d", seconds / 3600, seconds % 3600 / 60, seconds % 60)
    }

    private var weekData: [DayActivity] {
        let calendar = Calendar.current
        let formatter = DateFormatter(); formatter.dateFormat = "EEE"
        let today = calendar.startOfDay(for: Date())
        let days = (0..<7).compactMap { calendar.date(byAdding: .day, value: $0 - 6, to: today) }
        let totals = days.map { day in projects.flatMap(\.sessions).filter { calendar.isDate($0.date, inSameDayAs: day) }.reduce(0) { $0 + $1.duration } }
        let peak = max(totals.max() ?? 1, 1)
        return zip(days, totals).map { DayActivity(label: String(formatter.string(from: $0.0).prefix(3)), ratio: $0.1 / peak, isToday: calendar.isDateInToday($0.0)) }
    }

    private func compactDuration(_ value: TimeInterval) -> String {
        let minutes = Int(value) / 60
        return minutes >= 60 ? "\(minutes / 60)h \(minutes % 60)m" : "\(minutes)m"
    }

    private func icon(for name: String) -> String {
        if name.localizedCaseInsensitiveContains("design") { return "laptopcomputer" }
        if name.localizedCaseInsensitiveContains("develop") { return "chevron.left.forwardslash.chevron.right" }
        if name.localizedCaseInsensitiveContains("learn") { return "book.closed" }
        return "person.2"
    }
}

private enum DashboardPeriod: String, CaseIterable, Identifiable {
    case today = "Today", week = "Week"
    var id: String { rawValue }
}

private struct DayActivity: Identifiable {
    let id = UUID(); let label: String; let ratio: Double; let isToday: Bool
}

private extension View {
    func dashboardCard() -> some View {
        padding(18).background(.white, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
            .shadow(color: .black.opacity(0.035), radius: 16, y: 6)
    }
}

struct ProjectPickerSheet: View {
    let title: String
    let projects: [TTProject]
    let runningProjectID: TTProject.ID?
    let onSelect: (TTProject) -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List(projects) { project in
                Button { onSelect(project) } label: {
                    HStack(spacing: 14) {
                        Circle().fill(project.accentColor).frame(width: 11, height: 11)
                        Text(project.name).foregroundStyle(.primary)
                        Spacer()
                        if runningProjectID == project.id { Image(systemName: "timer").foregroundStyle(Color.brandNavy) }
                    }.padding(.vertical, 7)
                }
            }
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        }
    }
}
