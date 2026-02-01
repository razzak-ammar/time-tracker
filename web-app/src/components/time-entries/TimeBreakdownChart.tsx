"use client";

import { TimeEntry, Project } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useMemo } from "react";
import { PieChart as PieChartIcon } from "lucide-react";

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

interface TimeBreakdownChartProps {
  entries: TimeEntry[];
  projectMap: Map<string, Project>;
}

interface ChartDataItem {
  name: string;
  value: number;
  color: string;
}

export function TimeBreakdownChart({ entries, projectMap }: TimeBreakdownChartProps) {
  const chartData = useMemo(() => {
    const byProject = new Map<string, { minutes: number; project: Project }>();
    const now = new Date();

    for (const entry of entries) {
      const durationMs = entry.endTime
        ? entry.endTime.getTime() - entry.startTime.getTime()
        : now.getTime() - entry.startTime.getTime();
      const minutes = Math.round(durationMs / (1000 * 60));
      if (minutes <= 0) continue;

      const project = projectMap.get(entry.projectId);
      if (!project) continue;

      const existing = byProject.get(entry.projectId);
      if (existing) {
        existing.minutes += minutes;
      } else {
        byProject.set(entry.projectId, { minutes, project });
      }
    }

    return Array.from(byProject.entries()).map(([projectId, { minutes, project }], i) => ({
      name: project.name,
      value: minutes,
      color: project.color || CHART_COLORS[i % CHART_COLORS.length],
    })) as ChartDataItem[];
  }, [entries, projectMap]);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PieChartIcon className="h-4 w-4" />
            Time by Project
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <PieChartIcon className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">No time entries in this period</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PieChartIcon className="h-4 w-4" />
          Time by Project
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number | undefined) =>
                  formatDuration(value ?? 0)
                }
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                  color: "hsl(var(--card-foreground))",
                }}
                labelStyle={{ color: "hsl(var(--card-foreground))" }}
                itemStyle={{ color: "hsl(var(--card-foreground))" }}
              />
              <Legend
                formatter={(value, entry) => {
                  const item = chartData.find((d) => d.name === value);
                  const total = chartData.reduce((sum, d) => sum + d.value, 0);
                  const pct = item ? Math.round((item.value / total) * 100) : 0;
                  return `${value} (${formatDuration((item?.value ?? 0))} · ${pct}%)`;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
