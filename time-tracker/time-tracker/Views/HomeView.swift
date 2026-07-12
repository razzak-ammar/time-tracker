//
//  HomeView.swift
//  time-tracker
//
//  Created by Ammar Razzak on 6/8/26.
//

import SwiftUI

// MARK: - Home View

/// The default detail panel shown when no project is selected.
/// Displays a live running-timer hero (if a timer is active), quick-launch
/// recent project cards, and motivational productivity stats.
struct HomeView: View {
    let projects: [TTProject]
    @Binding var runningProjectID: TTProject.ID?
    @Binding var startedAt: Date?
    @Binding var carriedSeconds: TimeInterval
    let onNavigateToProject: (TTProject.ID) -> Void
    let onStartStop: (TTProject) -> Void

    // MARK: Derived

    private var runningProject: TTProject? {
        guard let id = runningProjectID else { return nil }
        return projects.first(where: { $0.id == id })
    }

    private var recentProjects: [TTProject] {
        // Sort by most-recent session date, take top 4
        projects.sorted {
            ($0.sessions.first?.date ?? .distantPast) > ($1.sessions.first?.date ?? .distantPast)
        }
    }

    private var todayTotal: TimeInterval {
        let calendar = Calendar.current
        return projects.flatMap(\.sessions)
            .filter { calendar.isDateInToday($0.date) }
            .reduce(0) { $0 + $1.duration }
    }

    private var weekTotal: TimeInterval {
        let cal = Calendar.current
        let now = Date()
        let startOfWeek = cal.date(from: cal.dateComponents([.yearForWeekOfYear, .weekOfYear], from: now))!
        return projects.flatMap(\.sessions)
            .filter { $0.date >= startOfWeek }
            .reduce(0) { $0 + $1.duration }
    }

    private var longestSession: TimeInterval {
        projects.flatMap(\.sessions).map(\.duration).max() ?? 0
    }

    private var currentStreak: Int {
        // Count consecutive calendar days (ending today) that have at least one session
        let cal = Calendar.current
        let allDates = Set(
            projects.flatMap(\.sessions)
                .map { cal.startOfDay(for: $0.date) }
        )
        var streak = 0
        var day = cal.startOfDay(for: Date())
        while allDates.contains(day) {
            streak += 1
            day = cal.date(byAdding: .day, value: -1, to: day)!
        }
        return streak
    }

    // Weekly goal in seconds (e.g. 20 hours)
    private let weekGoal: TimeInterval = 20 * 3600

    // MARK: Body

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                greetingHeader
                if let running = runningProject {
                    runningTimerHero(project: running)
                } else {
                    idleHero
                }
                recentSection
            }
            .padding(24)
        }
        .background(Color.appBackground)
    }



    // MARK: Greeting

    private var greetingHeader: some View {
        let hour = Calendar.current.component(.hour, from: Date())
        let greeting: String
        switch hour {
        case 5..<12:  greeting = "Good morning"
        case 12..<17: greeting = "Good afternoon"
        case 17..<21: greeting = "Good evening"
        default:      greeting = "Working late"
        }

        return HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 4) {
                Text(greeting + " 👋")
                    .font(.system(size: 26, weight: .bold, design: .rounded))
                    .foregroundStyle(.primary)
                Text("Let's get something done today.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            if currentStreak > 0 {
                HStack(spacing: 5) {
                    Image(systemName: "flame.fill")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(Color(hue: 0.06, saturation: 0.80, brightness: 0.97))
                    Text("\(currentStreak)")
                        .font(.system(size: 15, weight: .bold, design: .rounded))
                        .foregroundStyle(.primary)
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(Color.secondaryBackground, in: Capsule())
                .overlay(Capsule().strokeBorder(Color.primary.opacity(0.08), lineWidth: 0.75))
                .padding(.top, 4)
            }
        }
    }

    // MARK: Running Timer Hero

    private func runningTimerHero(project: TTProject) -> some View {
        ZStack(alignment: .bottomLeading) {
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .fill(Color.secondaryBackground)
                .overlay(
                    RoundedRectangle(cornerRadius: 28, style: .continuous)
                        .strokeBorder(Color.primary.opacity(0.08), lineWidth: 1)
                )

            VStack(alignment: .leading, spacing: 18) {
                // Status badge
                HStack(spacing: 8) {
                    PulsingDot(color: .green)
                    Text("RUNNING")
                        .font(.system(.caption, design: .rounded))
                        .fontWeight(.semibold)
                        .foregroundStyle(.green)
                        .tracking(1.2)
                }

                // Project name
                Button {
                    onNavigateToProject(project.id)
                } label: {
                    HStack(alignment: .center, spacing: 10) {
                        Circle()
                            .fill(project.accentColor)
                            .frame(width: 10, height: 10)
                        Text(project.name)
                            .font(.system(size: 20, weight: .semibold, design: .rounded))
                            .foregroundStyle(.primary)
                        Image(systemName: "chevron.right")
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                    }
                }
                .buttonStyle(.plain)

                // Live clock
                TimelineView(.periodic(from: .now, by: 1)) { _ in
                    let elapsed = elapsedSeconds
                    Text(formattedTime(elapsed))
                        .font(.system(size: 56, weight: .bold, design: .rounded))
                        .monospacedDigit()
                        .contentTransition(.numericText())
                        .foregroundStyle(.primary)
                }

                // Stop button
                Button {
                    onStartStop(project)
                } label: {
                    Label("Stop Timer", systemImage: "stop.fill")
                        .font(.system(.subheadline, design: .rounded))
                        .fontWeight(.semibold)
                        .foregroundStyle(.white)
                        .padding(.horizontal, 20)
                        .padding(.vertical, 11)
                        .background(Color.red.opacity(0.85), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                .buttonStyle(.plain)
            }
            .padding(26)
        }
    }

    // MARK: Idle Hero

    private var idleHero: some View {
        HStack(spacing: 10) {
            Image(systemName: "timer")
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(.tertiary)
            Text("No active timer — pick a project below to start.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color.secondaryBackground, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .strokeBorder(Color.primary.opacity(0.08), lineWidth: 0.75)
        )
    }

    // MARK: Stats Strip

    private var statsStrip: some View {
        let progress = min(weekTotal / weekGoal, 1.0)

        return HStack(spacing: 0) {

            // Today
            HStack(spacing: 8) {
                Image(systemName: "sun.max.fill")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(.orange)
                VStack(alignment: .leading, spacing: 1) {
                    Text(todayTotal == 0 ? "—" : formattedHours(todayTotal))
                        .font(.system(.subheadline, design: .rounded))
                        .fontWeight(.semibold)
                        .monospacedDigit()
                    Text("Today")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
            .frame(maxWidth: .infinity)

            Rectangle()
                .fill(Color.primary.opacity(0.10))
                .frame(width: 0.5, height: 34)

            // Streak
            HStack(spacing: 8) {
                Image(systemName: "flame.fill")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Color(hue: 0.06, saturation: 0.80, brightness: 0.97))
                VStack(alignment: .leading, spacing: 1) {
                    Text("\(currentStreak) day\(currentStreak == 1 ? "" : "s")")
                        .font(.system(.subheadline, design: .rounded))
                        .fontWeight(.semibold)
                        .monospacedDigit()
                    Text("Streak")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
            .frame(maxWidth: .infinity)

            Rectangle()
                .fill(Color.primary.opacity(0.10))
                .frame(width: 0.5, height: 34)

            // This week
            HStack(spacing: 8) {
                Image(systemName: "chart.bar.fill")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Color.brandBlue)
                VStack(alignment: .leading, spacing: 4) {
                    HStack(alignment: .firstTextBaseline, spacing: 4) {
                        Text(formattedHours(weekTotal))
                            .font(.system(.subheadline, design: .rounded))
                            .fontWeight(.semibold)
                            .monospacedDigit()
                        Text("· \(Int(progress * 100))%")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            RoundedRectangle(cornerRadius: 2, style: .continuous)
                                .fill(Color.brandBluePale.opacity(0.45))
                            RoundedRectangle(cornerRadius: 2, style: .continuous)
                                .fill(Color.brandBlue)
                                .frame(width: geo.size.width * progress)
                        }
                        .frame(height: 4)
                    }
                    .frame(height: 4)
                    Text("This week")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color.secondaryBackground, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .strokeBorder(Color.primary.opacity(0.08), lineWidth: 0.75)
        )
        .animation(.spring(response: 0.5, dampingFraction: 0.8), value: progress)
    }

    // MARK: Recent Projects

    private var recentSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Recent Projects")
                .font(.system(.headline, design: .rounded))
                .foregroundStyle(.secondary)
                .padding(.horizontal, 2)

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                ForEach(recentProjects) { project in
                    RecentProjectCard(
                        project: project,
                        isRunning: runningProjectID == project.id,
                        onOpen: { onNavigateToProject(project.id) },
                        onStartStop: { onStartStop(project) }
                    )
                }
            }
        }
    }

    // MARK: Helpers

    private var elapsedSeconds: TimeInterval {
        guard let startedAt else { return carriedSeconds }
        return carriedSeconds + Date().timeIntervalSince(startedAt)
    }

    private func formattedTime(_ interval: TimeInterval) -> String {
        let s = Int(interval)
        return String(format: "%02d:%02d:%02d", s / 3600, (s % 3600) / 60, s % 60)
    }

    private func formattedHours(_ interval: TimeInterval) -> String {
        let hours = interval / 3600
        if hours < 1 {
            return String(format: "%.0fm", interval / 60)
        }
        return String(format: "%.1fh", hours)
    }
}

// MARK: - Pulsing Dot

struct PulsingDot: View {
    let color: Color
    @State private var pulsing = false

    var body: some View {
        ZStack {
            Circle()
                .fill(color.opacity(0.35))
                .frame(width: 16, height: 16)
                .scaleEffect(pulsing ? 1.5 : 1.0)
                .opacity(pulsing ? 0 : 0.6)

            Circle()
                .fill(color)
                .frame(width: 8, height: 8)
        }
        .onAppear {
            withAnimation(.easeOut(duration: 1.1).repeatForever(autoreverses: false)) {
                pulsing = true
            }
        }
    }
}

// MARK: - Recent Project Card

struct RecentProjectCard: View {
    let project: TTProject
    let isRunning: Bool
    let onOpen: () -> Void
    let onStartStop: () -> Void

    @State private var isHovered = false

    private var lastSession: TTSession? { project.sessions.first }

    private var totalTime: TimeInterval {
        project.sessions.reduce(0) { $0 + $1.duration }
    }

    var body: some View {
        HStack(spacing: 10) {
            // Left side (tappable to open)
            HStack(spacing: 10) {
                Circle()
                    .fill(isRunning ? Color.green : project.accentColor)
                    .frame(width: 9, height: 9)
                    .animation(.easeInOut(duration: 0.3), value: isRunning)

                Text(project.name)
                    .font(.system(.subheadline, design: .rounded))
                    .fontWeight(.semibold)
                    .foregroundStyle(.primary)
                    .lineLimit(1)

                Spacer()

                Text(formattedTime(totalTime))
                    .font(.system(.caption, design: .rounded))
                    .fontWeight(.semibold)
                    .monospacedDigit()
                    .foregroundStyle(.secondary)
            }
            .contentShape(Rectangle())
            .onTapGesture(perform: onOpen)

            // Right side: Play/Stop button
            Button(action: onStartStop) {
                Image(systemName: isRunning ? "stop.fill" : "play.fill")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(isRunning ? .red : project.accentColor)
                    .frame(width: 28, height: 28)
                    .background(
                        (isRunning ? Color.red : project.accentColor).opacity(0.12),
                        in: Circle()
                    )
                    .contentTransition(.symbolEffect(.replace))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("\(isRunning ? "Stop" : "Start") \(project.name)")
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
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
                .strokeBorder(Color.primary.opacity(isHovered ? 0.14 : 0.08), lineWidth: 0.75)
        )
        .scaleEffect(isHovered ? 1.015 : 1.0)
        .onHover { isHovered = $0 }
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isHovered)
    }

    private func formattedTime(_ interval: TimeInterval) -> String {
        let totalMinutes = Int(interval.rounded()) / 60
        let hours = totalMinutes / 60
        let mins = totalMinutes % 60
        if hours == 0 {
            return "\(max(1, mins)) min"
        } else if mins == 0 {
            return "\(hours)hr"
        } else {
            return "\(hours)hr \(mins)m"
        }
    }
}

// MARK: - Preview

#Preview {
    let projects = [
        TTProject(name: "iOS App",          accentColor: .brandNavy,      sessions: makeSessions(count: 5, spread: 2)),
        TTProject(name: "Marketing Site",   accentColor: .brandBlueDeep,  sessions: makeSessions(count: 3, spread: 3)),
        TTProject(name: "Client Dashboard", accentColor: .brandBlue,      sessions: makeSessions(count: 6, spread: 1)),
        TTProject(name: "Internal Tools",   accentColor: .brandBlueLight, sessions: makeSessions(count: 4, spread: 4)),
    ]

    HomeView(
        projects: projects,
        runningProjectID: .constant(nil),
        startedAt: .constant(nil),
        carriedSeconds: .constant(0),
        onNavigateToProject: { _ in },
        onStartStop: { _ in }
    )
    .frame(width: 640, height: 720)
}
