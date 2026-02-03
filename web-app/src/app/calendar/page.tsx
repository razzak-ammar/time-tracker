"use client";

import { useMemo, useState } from "react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { WeekHeader, WeekDayMeta } from "@/components/calendar/WeekHeader";
import {
  DailyTimeline,
  TimelineHourLabels,
} from "@/components/calendar/DailyTimeline";
import {
  format,
  startOfWeek,
  addDays,
  startOfDay,
  endOfDay,
  isSameDay,
} from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

export type CalendarViewMode = "day" | "week" | "custom";
const CUSTOM_DAY_OPTIONS = [3, 5, 7, 10, 14] as const;

export default function CalendarPage() {
  const { timeEntries, projects, updateTimeEntryFields } = useTimeTracking();
  const [focusedDate, setFocusedDate] = useState(new Date());
  const [hourHeight, setHourHeight] = useState(60);
  const [viewMode, setViewMode] = useState<CalendarViewMode>("day");
  const [customDays, setCustomDays] = useState(5);

  const daysInView =
    viewMode === "day" ? 7 : viewMode === "week" ? 7 : customDays;

  const weekDays = useMemo(() => {
    if (viewMode === "custom") {
      return Array.from({ length: customDays }, (_, index) =>
        addDays(startOfDay(focusedDate), index),
      );
    }
    const start = startOfWeek(focusedDate, { weekStartsOn: 1 });
    const length = viewMode === "day" ? 7 : 7;
    return Array.from({ length }, (_, index) => addDays(start, index));
  }, [focusedDate, viewMode, customDays]);

  const projectMap = useMemo(() => {
    const map = new Map<string, (typeof projects)[number]>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  const dayMeta = useMemo<Record<string, WeekDayMeta>>(() => {
    const meta: Record<string, WeekDayMeta> = {};

    timeEntries.forEach((entry) => {
      const key = format(entry.startTime, "yyyy-MM-dd");
      const project = projectMap.get(entry.projectId);
      if (!project) return;

      if (!meta[key]) {
        meta[key] = { totalMs: 0, projectColors: [] };
      }

      const end = entry.endTime ?? new Date();
      meta[key].totalMs += end.getTime() - entry.startTime.getTime();

      if (!meta[key].projectColors.includes(project.color)) {
        meta[key].projectColors.push(project.color);
      }
    });

    return meta;
  }, [timeEntries, projectMap]);

  const entriesForFocusedDay = useMemo(() => {
    const dayStart = startOfDay(focusedDate);
    const dayEnd = endOfDay(focusedDate);

    return timeEntries.filter((entry) => {
      const end = entry.endTime ?? new Date();
      return entry.startTime <= dayEnd && end >= dayStart;
    });
  }, [timeEntries, focusedDate]);

  const entriesByDayKey = useMemo(() => {
    const map: Record<string, typeof timeEntries> = {};
    weekDays.forEach((day) => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      map[format(day, "yyyy-MM-dd")] = timeEntries.filter((entry) => {
        const end = entry.endTime ?? new Date();
        return entry.startTime <= dayEnd && end >= dayStart;
      });
    });
    return map;
  }, [timeEntries, weekDays]);

  const timelineDays = viewMode === "day" ? [focusedDate] : weekDays;

  const handleRangeChange = (direction: "prev" | "next") => {
    setFocusedDate((prev) =>
      addDays(prev, direction === "next" ? daysInView : -daysInView),
    );
  };

  const selectValue =
    viewMode === "custom" ? `custom-${customDays}` : viewMode;

  const handleViewChange = (value: string) => {
    if (value === "day" || value === "week") {
      setViewMode(value);
      return;
    }
    if (value.startsWith("custom-")) {
      const n = parseInt(value.replace("custom-", ""), 10);
      if (CUSTOM_DAY_OPTIONS.includes(n as (typeof CUSTOM_DAY_OPTIONS)[number])) {
        setCustomDays(n);
        setViewMode("custom");
      }
    }
  };

  return (
    <div className="flex-1 min-h-0 h-full overflow-hidden box-border px-4 py-3 flex flex-col gap-3">
      <div
        className={cn(
          "shrink-0",
          timelineDays.length > 3
            ? "flex items-center justify-between gap-3"
            : "grid grid-cols-[1fr_auto_1fr] items-start gap-3",
        )}
      >
        {timelineDays.length > 3 ? (
          <WeekHeader
            weekDays={weekDays}
            focusedDate={focusedDate}
            onSelect={setFocusedDate}
            onWeekChange={handleRangeChange}
            dayMeta={dayMeta}
            compact
          />
        ) : (
          <>
            <div />
            <div className="min-w-0 flex justify-center">
              <WeekHeader
                weekDays={weekDays}
                focusedDate={focusedDate}
                onSelect={setFocusedDate}
                onWeekChange={handleRangeChange}
                dayMeta={dayMeta}
              />
            </div>
          </>
        )}
        <div className={timelineDays.length > 3 ? "" : "flex justify-end"}>
          <Select value={selectValue} onValueChange={handleViewChange}>
            <SelectTrigger
              className="w-[140px] shrink-0"
              aria-label="Calendar view"
            >
              <CalendarDays className="h-4 w-4 opacity-70" />
              <SelectValue placeholder="View" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              {CUSTOM_DAY_OPTIONS.map((n) => (
                <SelectItem key={n} value={`custom-${n}`}>
                  {n} days
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col min-w-0 overflow-hidden">
        {viewMode === "day" ? (
          <DailyTimeline
            date={focusedDate}
            entries={entriesForFocusedDay}
            projects={projects}
            hourHeight={hourHeight}
            onHourHeightChange={setHourHeight}
            onUpdateEntry={updateTimeEntryFields}
          />
        ) : (
          <div className="flex-1 min-h-0 min-w-0 flex flex-col rounded-xl bg-card/60 backdrop-blur-sm overflow-hidden">
            {/* Day column headers - sticky; same flex structure as timeline so they align */}
            <div className="flex shrink-0 border-b border-border/60 bg-muted/30">
              <div className="w-16 shrink-0" />
              <div className="flex flex-1 min-w-0">
                {timelineDays.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const isFocused = isSameDay(day, focusedDate);
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div
                      key={key}
                      className={cn(
                        "flex-1 min-w-[200px] py-2 px-2 text-center text-xs font-medium border-r border-border/40 last:border-r-0",
                        isFocused && "bg-primary/10 text-primary",
                        isToday && !isFocused && "text-primary",
                      )}
                    >
                      {format(day, "EEE d")}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
              <div className="pt-4">
                <div className="flex" style={{ minHeight: 24 * hourHeight }}>
                  <TimelineHourLabels hourHeight={hourHeight} />
                  <div className="flex flex-1 min-w-0">
                    {timelineDays.map((day, index) => {
                      const key = format(day, "yyyy-MM-dd");
                      const entries = entriesByDayKey[key] ?? [];
                      const isLast = index === timelineDays.length - 1;
                      return (
                        <DailyTimeline
                          key={key}
                          date={day}
                          entries={entries}
                          projects={projects}
                          hourHeight={hourHeight}
                          onHourHeightChange={setHourHeight}
                          onUpdateEntry={updateTimeEntryFields}
                          sharedTimeline
                          showResizeHandle={isLast}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

