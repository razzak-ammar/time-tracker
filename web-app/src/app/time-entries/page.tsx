"use client";

import { useTimeEntries, useTimeTracking } from "@/hooks/useTimeTracking";
import { TimeEntryListItem } from "@/components/time-entries/TimeEntryListItem";
import { TimeBreakdownChart } from "@/components/time-entries/TimeBreakdownChart";
import { TimeEntriesCalendarSidebar } from "@/components/time-entries/TimeEntriesCalendarSidebar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Calendar } from "lucide-react";
import { useState, useMemo } from "react";
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";

export default function TimeEntriesPage() {
  const { projects } = useTimeTracking();
  const timeEntries = useTimeEntries();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<string>("past-7-days");
  const [selectedDate, setSelectedDate] = useState<Date>();

  // Create a map of projects for quick lookup
  const projectMap = useMemo(() => {
    const map = new Map<string, (typeof projects)[0]>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  // Filter time entries based on search, project, and time filter
  const filteredEntries = useMemo(() => {
    let filtered = timeEntries;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter((entry) => {
        const project = projectMap.get(entry.projectId);
        return (
          project?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    // Filter by project
    if (selectedProject !== "all") {
      filtered = filtered.filter(
        (entry) => entry.projectId === selectedProject,
      );
    }

    // A calendar date takes precedence over the broader time-period presets.
    const now = new Date();
    if (selectedDate) {
      filtered = filtered.filter(
        (entry) =>
          entry.startTime >= startOfDay(selectedDate) &&
          entry.startTime <= endOfDay(selectedDate),
      );
    } else switch (timeFilter) {
      case "past-7-days":
        filtered = filtered.filter((entry) => {
          const entryDate = entry.startTime;
          return entryDate >= subDays(now, 7) && entryDate <= now;
        });
        break;
      case "this-week":
        filtered = filtered.filter((entry) => {
          const entryDate = entry.startTime;
          return entryDate >= startOfWeek(now) && entryDate <= endOfWeek(now);
        });
        break;
      case "this-month":
        filtered = filtered.filter((entry) => {
          const entryDate = entry.startTime;
          return entryDate >= startOfMonth(now) && entryDate <= endOfMonth(now);
        });
        break;
      case "all":
      default:
        break;
    }

    return filtered.sort(
      (a, b) => b.startTime.getTime() - a.startTime.getTime(),
    );
  }, [
    timeEntries,
    searchTerm,
    selectedProject,
    timeFilter,
    selectedDate,
    projectMap,
  ]);

  // Calculate total time for filtered entries (include active entries)
  const totalTime = useMemo(() => {
    const now = new Date();
    return filteredEntries.reduce((total, entry) => {
      const end = entry.endTime ?? now;
      return total + (end.getTime() - entry.startTime.getTime());
    }, 0);
  }, [filteredEntries]);

  const formatDuration = (milliseconds: number) => {
    const minutes = Math.round(milliseconds / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const hasActiveFilters =
    searchTerm || selectedProject !== "all" || timeFilter !== "all";

  const selectTimeFilter = (filter: string) => {
    setSelectedDate(undefined);
    setTimeFilter(filter);
  };

  const selectCalendarDate = (date?: Date) => {
    setSelectedDate(date);
    if (date) setTimeFilter("all");
  };

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col md:flex-row">
      <TimeEntriesCalendarSidebar
        entries={timeEntries}
        projects={projects}
        selectedDate={selectedDate}
        onSelectDate={selectCalendarDate}
      />

      <div className="min-w-0 flex-1 space-y-6 px-4 py-6 lg:px-6">
      {/* Tabs and Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {selectedDate && (
              <Button
                variant="secondary"
                size="sm"
                className="h-7 px-3 text-xs font-medium ring-1 ring-primary/30"
              >
                {format(selectedDate, "MMM d")}
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => selectTimeFilter("past-7-days")}
              className={`h-7 px-3 text-xs font-medium ${
                !selectedDate && timeFilter === "past-7-days"
                  ? "bg-secondary/80 ring-1 ring-primary/30"
                  : ""
              }`}
            >
              Past 7 Days
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => selectTimeFilter("this-week")}
              className={`h-7 px-3 text-xs font-medium ${
                !selectedDate && timeFilter === "this-week"
                  ? "bg-secondary/80 ring-1 ring-primary/30"
                  : ""
              }`}
            >
              This Week
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => selectTimeFilter("this-month")}
              className={`h-7 px-3 text-xs font-medium ${
                !selectedDate && timeFilter === "this-month"
                  ? "bg-secondary/80 ring-1 ring-primary/30"
                  : ""
              }`}
            >
              This Month
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => selectTimeFilter("all")}
              className={`h-7 px-3 text-xs font-medium ${
                !selectedDate && timeFilter === "all"
                  ? "bg-secondary/80 ring-1 ring-primary/30"
                  : ""
              }`}
            >
              All Time
            </Button>
          </div>
          <div className="text-sm text-muted-foreground shrink-0">
            Total: {formatDuration(totalTime)}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search entries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Time Breakdown Chart */}
      <TimeBreakdownChart entries={filteredEntries} projectMap={projectMap} />

      {/* Time Entries List */}
      {filteredEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl border border-border/50 bg-card/30">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No time entries found</h3>
          <p className="text-muted-foreground text-center text-sm">
            {hasActiveFilters
              ? "Try adjusting your filters to see more results."
              : "Start tracking time to see your entries here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map((entry) => {
            const project = projectMap.get(entry.projectId);
            if (!project) return null;

            return (
              <TimeEntryListItem
                key={entry.id}
                timeEntry={entry}
                project={project}
              />
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
