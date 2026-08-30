"use client";

import { useMemo } from "react";
import type { Project, TimeEntry } from "@/types";

interface TimeBreakdownChartProps {
  entries: TimeEntry[];
  projectMap: Map<string, Project>;
}

interface ProjectDuration {
  id: string;
  name: string;
  minutes: number;
  color: string;
}

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours > 0 ? `${hours}h ${remainder}m` : `${remainder}m`;
};

export function TimeBreakdownChart({
  entries,
  projectMap,
}: TimeBreakdownChartProps) {
  const projectDurations = useMemo(() => {
    const durations = new Map<string, ProjectDuration>();
    const now = new Date();

    for (const entry of entries) {
      const end = entry.endTime ?? now;
      const minutes = Math.round(
        (end.getTime() - entry.startTime.getTime()) / 60_000,
      );
      const project = projectMap.get(entry.projectId);
      if (!project || minutes <= 0) continue;

      const existing = durations.get(project.id);
      if (existing) {
        existing.minutes += minutes;
      } else {
        durations.set(project.id, {
          id: project.id,
          name: project.name,
          minutes,
          color: project.color,
        });
      }
    }

    return Array.from(durations.values()).sort(
      (a, b) => b.minutes - a.minutes,
    );
  }, [entries, projectMap]);

  const totalMinutes = projectDurations.reduce(
    (total, project) => total + project.minutes,
    0,
  );

  if (totalMinutes === 0) return null;

  return (
    <section className="border-b border-border/60 pb-6">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-semibold tracking-tight">Project split</h2>
        <span className="text-xs tabular-nums text-muted-foreground">
          {formatDuration(totalMinutes)} tracked
        </span>
      </div>

      <div
        className="flex h-3 w-full gap-0.5 rounded-full bg-muted/35"
        aria-label="Time distribution by project"
      >
        {projectDurations.map((project, index) => {
          const percentage = (project.minutes / totalMinutes) * 100;
          return (
            <button
              key={project.id}
              type="button"
              className="time-breakdown-segment group/segment relative h-full min-w-1 origin-left rounded-sm outline-none transition-[transform,filter] duration-200 hover:z-20 hover:-translate-y-0.5 hover:brightness-110 focus-visible:z-20 focus-visible:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-foreground/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background first:rounded-l-full last:rounded-r-full"
              style={{
                width: `${percentage}%`,
                backgroundColor: project.color,
                animationDelay: `${index * 55}ms`,
              }}
              aria-label={`${project.name}: ${formatDuration(project.minutes)}, ${Math.round(percentage)} percent`}
            >
              <span className="pointer-events-none absolute bottom-[calc(100%+0.65rem)] left-1/2 z-30 w-max max-w-56 -translate-x-1/2 translate-y-1 rounded-lg border border-border bg-[hsl(var(--popover))] px-3 py-2 text-left opacity-0 shadow-xl transition-[opacity,transform] duration-150 group-hover/segment:translate-y-0 group-hover/segment:opacity-100 group-focus-visible/segment:translate-y-0 group-focus-visible/segment:opacity-100">
                <span className="block max-w-48 truncate text-xs font-medium text-[hsl(var(--popover-foreground))]">
                  {project.name}
                </span>
                <span className="mt-0.5 block text-[11px] tabular-nums text-muted-foreground">
                  {formatDuration(project.minutes)} · {Math.round(percentage)}%
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
