//
//  TimeEntriesView.swift
//  time-tracker
//
//  Created by Ammar Razzak on 5/31/26.
//

import SwiftUI
import Charts

// MARK: - Time range

enum TimeRange: String, CaseIterable, Identifiable {
    case last7Days  = "7 Days"
    case last30Days = "30 Days"
    case lastWeek   = "Last Week"
    case lastMonth  = "Last Month"
    case allTime    = "All Time"

    var id: String { rawValue }

    func dateRange() -> ClosedRange<Date> {
        let cal = Calendar.current
        let now = Date()
        switch self {
        case .last7Days:
            return cal.date(byAdding: .day, value: -7, to: now)!...now
        case .last30Days:
            return cal.date(byAdding: .day, value: -30, to: now)!...now
        case .lastWeek:
            // Mon–Sun of the previous calendar week
            let weekday = cal.component(.weekday, from: now) // Sun=1 … Sat=7
            let daysSinceLastMonday = ((weekday - 2) + 7) % 7
            let lastMonday = cal.date(byAdding: .day, value: -(daysSinceLastMonday + 7), to: now)!
            let lastSunday = cal.date(byAdding: .day, value: 6, to: lastMonday)!
            return lastMonday...lastSunday
        case .lastMonth:
            let startOfThis = cal.date(from: cal.dateComponents([.year, .month], from: now))!
            let startOfLast = cal.date(byAdding: .month, value: -1, to: startOfThis)!
            let endOfLast   = cal.date(byAdding: .second, value: -1, to: startOfThis)!
            return startOfLast...endOfLast
        case .allTime:
            return Date.distantPast...now
        }
    }
}

// MARK: - Summary model

struct ProjectSummary: Identifiable {
    let id: UUID
    let name: String
    let color: Color
    let totalSeconds: TimeInterval
}

// MARK: - Time Entries View

struct TimeEntriesView: View {
    let projects: [TTProject]

    @State private var selectedRange: TimeRange = .last7Days
    @State private var highlightedID: UUID? = nil

    // MARK: Derived data

    private var summaries: [ProjectSummary] {
        let range = selectedRange.dateRange()
        return projects.compactMap { project in
            let total = project.sessions
                .filter { range.contains($0.date) }
                .reduce(0) { $0 + $1.duration }
            guard total > 0 else { return nil }
            return ProjectSummary(id: project.id, name: project.name,
                                  color: project.accentColor, totalSeconds: total)
        }
        .sorted { $0.totalSeconds > $1.totalSeconds }
    }

    private var grandTotal: TimeInterval {
        summaries.reduce(0) { $0 + $1.totalSeconds }
    }

    // MARK: Body

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                header
                rangeSelector
                if summaries.isEmpty {
                    emptyState
                } else {
                    chartCard
                    legendCard
                }
            }
            .padding(24)
        }
        .background(Color.appBackground)
        .onChange(of: selectedRange) { _, _ in
            withAnimation(.easeInOut(duration: 0.25)) { highlightedID = nil }
        }
    }

    // MARK: Header

    private var header: some View {
        HStack(alignment: .firstTextBaseline) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Time Entries")
                    .font(.system(size: 26, weight: .bold, design: .rounded))
                Text("Combined view across all projects")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            if grandTotal > 0 {
                VStack(alignment: .trailing, spacing: 2) {
                    Text("Total")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .textCase(.uppercase)
                        .tracking(0.6)
                    Text(formattedTime(grandTotal))
                        .font(.system(.title3, design: .rounded))
                        .fontWeight(.bold)
                        .monospacedDigit()
                }
            }
        }
    }

    // MARK: Range selector

    private var rangeSelector: some View {
        HStack(spacing: 6) {
            ForEach(TimeRange.allCases) { range in
                Button(range.rawValue) {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.75)) {
                        selectedRange = range
                    }
                }
                .buttonStyle(RangeChipStyle(isSelected: selectedRange == range))
            }
        }
    }

    // MARK: Chart card

    private var chartCard: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(Color.secondaryBackground)
                .overlay(
                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                        .strokeBorder(Color.primary.opacity(0.07), lineWidth: 0.75)
                )

            VStack(spacing: 0) {
                ZStack {
                    // Donut chart
                    Chart(summaries) { summary in
                        SectorMark(
                            angle: .value("Time", summary.totalSeconds),
                            innerRadius: .ratio(0.58),
                            angularInset: 2.5
                        )
                        .foregroundStyle(summary.color)
                        .cornerRadius(5)
                        .opacity(highlightedID == nil || highlightedID == summary.id ? 1.0 : 0.30)
                    }
                    .frame(width: 270, height: 270)
                    .animation(.easeInOut(duration: 0.25), value: highlightedID)

                    // Centre overlay
                    if let hid = highlightedID,
                       let s = summaries.first(where: { $0.id == hid }) {
                        centreLabel(title: s.name, time: s.totalSeconds,
                                    pct: grandTotal > 0 ? s.totalSeconds / grandTotal * 100 : 0,
                                    color: s.color)
                    } else {
                        centreLabel(title: "Total", time: grandTotal, pct: nil, color: .secondary)
                    }
                }
                .padding(.vertical, 28)
            }
        }
    }

    @ViewBuilder
    private func centreLabel(title: String, time: TimeInterval, pct: Double?, color: Color) -> some View {
        VStack(spacing: 3) {
            Text(title)
                .font(.system(.caption, design: .rounded))
                .fontWeight(.semibold)
                .foregroundStyle(color)
                .textCase(.uppercase)
                .tracking(0.5)
                .lineLimit(1)
                .minimumScaleFactor(0.7)

            Text(formattedTime(time))
                .font(.system(size: 20, weight: .bold, design: .rounded))
                .monospacedDigit()

            if let pct {
                Text(String(format: "%.0f%%", pct))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(width: 120)
        .multilineTextAlignment(.center)
        .transition(.opacity.combined(with: .scale(scale: 0.92)))
        .animation(.easeInOut(duration: 0.2), value: highlightedID)
    }

    // MARK: Legend card

    private var legendCard: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(Color.secondaryBackground)
                .overlay(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .strokeBorder(Color.primary.opacity(0.07), lineWidth: 0.75)
                )

            VStack(spacing: 0) {
                ForEach(Array(summaries.enumerated()), id: \.element.id) { index, summary in
                    legendRow(summary: summary)
                    if index < summaries.count - 1 {
                        Divider()
                            .padding(.horizontal, 16)
                    }
                }
            }
            .padding(.vertical, 6)
        }
    }

    private func legendRow(summary: ProjectSummary) -> some View {
        let pct = grandTotal > 0 ? summary.totalSeconds / grandTotal * 100 : 0
        let isHighlighted = highlightedID == summary.id

        return Button {
            withAnimation(.easeInOut(duration: 0.2)) {
                highlightedID = isHighlighted ? nil : summary.id
            }
        } label: {
            HStack(spacing: 14) {
                RoundedRectangle(cornerRadius: 5, style: .continuous)
                    .fill(summary.color)
                    .frame(width: 14, height: 14)
                    .opacity(highlightedID == nil || isHighlighted ? 1 : 0.35)

                Text(summary.name)
                    .font(.subheadline)
                    .fontWeight(isHighlighted ? .semibold : .regular)
                    .foregroundStyle(isHighlighted ? .primary : .primary)

                Spacer()

                Text(String(format: "%.0f%%", pct))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(width: 42, alignment: .trailing)

                Text(formattedTime(summary.totalSeconds))
                    .font(.system(.subheadline, design: .rounded))
                    .fontWeight(.semibold)
                    .monospacedDigit()
                    .frame(width: 78, alignment: .trailing)
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 13)
            .background(
                isHighlighted
                    ? RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(Color.primary.opacity(0.06))
                    : nil
            )
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .animation(.easeInOut(duration: 0.15), value: isHighlighted)
    }

    // MARK: Empty state

    private var emptyState: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(Color.secondaryBackground)
                .overlay(
                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                        .strokeBorder(Color.primary.opacity(0.07), lineWidth: 0.75)
                )

            VStack(spacing: 14) {
                Image(systemName: "chart.pie")
                    .font(.system(size: 44))
                    .foregroundStyle(.tertiary)
                Text("No sessions in this period")
                    .font(.title3)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)
                Text("Try selecting a broader time range.")
                    .font(.subheadline)
                    .foregroundStyle(.tertiary)
            }
            .padding(48)
        }
    }

    // MARK: Helpers

    private func formattedTime(_ interval: TimeInterval) -> String {
        let s = Int(interval)
        return String(format: "%02d:%02d:%02d", s / 3600, (s % 3600) / 60, s % 60)
    }
}

// MARK: - Range chip button style

struct RangeChipStyle: ButtonStyle {
    let isSelected: Bool

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(.subheadline, design: .rounded))
            .fontWeight(isSelected ? .semibold : .regular)
            .padding(.horizontal, 14)
            .padding(.vertical, 7)
            .background(
                isSelected
                    ? AnyShapeStyle(.regularMaterial)
                    : AnyShapeStyle(Color.clear)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .strokeBorder(Color.primary.opacity(isSelected ? 0.13 : 0), lineWidth: 0.75)
            )
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            .foregroundStyle(isSelected ? .primary : .secondary)
            .scaleEffect(configuration.isPressed ? 0.96 : 1)
            .animation(.easeInOut(duration: 0.12), value: configuration.isPressed)
    }
}

// MARK: - Preview

#Preview {
    TimeEntriesView(projects: [
        TTProject(name: "iOS App",          accentColor: .brandNavy,      sessions: makeSessions(count: 5, spread: 2)),
        TTProject(name: "Marketing Site",   accentColor: .brandBlueDeep,  sessions: makeSessions(count: 3, spread: 3)),
        TTProject(name: "Client Dashboard", accentColor: .brandBlue,      sessions: makeSessions(count: 6, spread: 1)),
        TTProject(name: "Internal Tools",   accentColor: .brandBlueLight, sessions: makeSessions(count: 4, spread: 4)),
    ])
}
