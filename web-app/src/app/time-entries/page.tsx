"use client";

import { useMemo, useState } from "react";
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
import { AlertCircle, Clock3, Plus, Search, X } from "lucide-react";
import {
  useTimeEntriesWithStatus,
  useTimeTracking,
} from "@/hooks/useTimeTracking";
import { TimeEntryListItem } from "@/components/time-entries/TimeEntryListItem";
import { TimeBreakdownChart } from "@/components/time-entries/TimeBreakdownChart";
import { TimeEntriesCalendarSidebar } from "@/components/time-entries/TimeEntriesCalendarSidebar";
import { ManualEntryDialog } from "@/components/time-entries/ManualEntryForm";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const periodOptions = [
  { value: "past-7-days", label: "7 days" },
  { value: "this-week", label: "This week" },
  { value: "this-month", label: "This month" },
  { value: "all", label: "All time" },
];

const formatDuration = (milliseconds: number) => {
  const minutes = Math.round(milliseconds / 60_000);
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours > 0 ? `${hours}h ${remainder}m` : `${remainder}m`;
};

export default function TimeEntriesPage() {
  const { projects } = useTimeTracking();
  const { entries: timeEntries, isLoading, error } =
    useTimeEntriesWithStatus();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState("all");
  const [timeFilter, setTimeFilter] = useState("past-7-days");
  const [previewDate, setPreviewDate] = useState<Date>();
  const [reportDate, setReportDate] = useState<Date>();
  const [manualEntryOpen, setManualEntryOpen] = useState(false);

  const projectMap = useMemo(() => {
    const map = new Map<string, (typeof projects)[0]>();
    projects.forEach((project) => map.set(project.id, project));
    return map;
  }, [projects]);

  const filteredEntries = useMemo(() => {
    let filtered = timeEntries;

    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter((entry) => {
        const project = projectMap.get(entry.projectId);
        return (
          project?.name.toLowerCase().includes(query) ||
          entry.description?.toLowerCase().includes(query)
        );
      });
    }

    if (selectedProject !== "all") {
      filtered = filtered.filter(
        (entry) => entry.projectId === selectedProject,
      );
    }

    const now = new Date();
    if (reportDate) {
      filtered = filtered.filter(
        (entry) =>
          entry.startTime >= startOfDay(reportDate) &&
          entry.startTime <= endOfDay(reportDate),
      );
    } else {
      switch (timeFilter) {
        case "past-7-days":
          filtered = filtered.filter(
            (entry) => entry.startTime >= subDays(now, 7) && entry.startTime <= now,
          );
          break;
        case "this-week":
          filtered = filtered.filter(
            (entry) =>
              entry.startTime >= startOfWeek(now) &&
              entry.startTime <= endOfWeek(now),
          );
          break;
        case "this-month":
          filtered = filtered.filter(
            (entry) =>
              entry.startTime >= startOfMonth(now) &&
              entry.startTime <= endOfMonth(now),
          );
          break;
      }
    }

    return [...filtered].sort(
      (a, b) => b.startTime.getTime() - a.startTime.getTime(),
    );
  }, [
    projectMap,
    reportDate,
    searchTerm,
    selectedProject,
    timeEntries,
    timeFilter,
  ]);

  const totalTime = useMemo(() => {
    const now = new Date();
    return filteredEntries.reduce((total, entry) => {
      const end = entry.endTime ?? now;
      return total + (end.getTime() - entry.startTime.getTime());
    }, 0);
  }, [filteredEntries]);

  const hasActiveFilters =
    Boolean(searchTerm) ||
    selectedProject !== "all" ||
    timeFilter !== "all" ||
    Boolean(reportDate);

  const selectTimeFilter = (filter: string) => {
    setReportDate(undefined);
    setTimeFilter(filter);
  };

  return (
    <div className="mx-auto flex w-full max-w-[1720px] flex-1 flex-col md:flex-row">
      <TimeEntriesCalendarSidebar
        entries={timeEntries}
        projects={projects}
        selectedDate={previewDate}
        onSelectDate={setPreviewDate}
        onViewDateInReport={setReportDate}
        isLoading={isLoading}
      />

      <div className="min-w-0 flex-1 px-4 py-6 sm:px-7 lg:px-10 lg:py-9">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              Time entries
            </h1>
            <p className="mt-1.5 text-xs tabular-nums text-muted-foreground">
              {isLoading ? "Loading" : `${formatDuration(totalTime)} tracked`}
              {!isLoading && (
                <>
                  <span className="mx-1.5 text-border">·</span>
                  {filteredEntries.length}{" "}
                  {filteredEntries.length === 1 ? "entry" : "entries"}
                </>
              )}
            </p>
          </div>

          <Button
            onClick={() => setManualEntryOpen(true)}
            className="group h-9 rounded-lg bg-foreground px-3 text-sm font-medium text-background shadow-none transition-[background-color,transform,box-shadow] hover:-translate-y-0.5 hover:bg-foreground/90 hover:shadow-md active:translate-y-0 sm:px-3.5"
            aria-label="Create a new time entry"
          >
            <Plus className="mr-1.5 size-3.5 transition-transform duration-200 group-hover:rotate-90" />
            New entry
          </Button>
        </header>

        <ManualEntryDialog
          open={manualEntryOpen}
          onOpenChange={setManualEntryOpen}
        />

        <div className="mt-7 border-b border-border/60">
          <div className="scrollbar-hide flex items-center gap-6 overflow-x-auto">
            {reportDate && (
              <button
                type="button"
                onClick={() => setReportDate(undefined)}
                className="flex h-10 shrink-0 items-center gap-1.5 border-b-2 border-emerald-500 text-xs font-semibold text-foreground"
              >
                {format(reportDate, "MMM d")}
                <X className="size-3" />
              </button>
            )}
            {periodOptions.map((option) => {
              const isActive = !reportDate && timeFilter === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => selectTimeFilter(option.value)}
                  className={cn(
                    "relative h-10 shrink-0 border-b-2 text-xs font-medium transition-colors",
                    isActive
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search entries"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-10 rounded-lg border-border/70 bg-background pl-10 pr-9 shadow-none transition-[border-color,box-shadow] focus-visible:border-foreground/30 focus-visible:ring-2 focus-visible:ring-foreground/5"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="h-10 w-full rounded-lg border-border/70 bg-background text-sm shadow-none">
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error ? (
          <div
            className="mt-7 flex items-start gap-3 border-y border-destructive/20 bg-destructive/5 px-2 py-4 text-sm"
            role="alert"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div>
              <p className="font-medium">Couldn’t load time entries</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Check your connection and refresh the page.
              </p>
            </div>
          </div>
        ) : isLoading ? (
          <div
            className="mt-8 space-y-3"
            role="status"
            aria-label="Loading time entries"
          >
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-[72px] animate-pulse border-b border-border/50 bg-muted/15"
              />
            ))}
            <span className="sr-only">Loading time entries…</span>
          </div>
        ) : (
          <div
            key={reportDate ? format(reportDate, "yyyy-MM-dd") : timeFilter}
            className="mt-8 animate-date-preview motion-reduce:animate-none"
          >
            {filteredEntries.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center border-y border-border/50 px-4 text-center">
                <span className="flex size-10 items-center justify-center rounded-xl bg-muted/45 text-muted-foreground">
                  <Clock3 className="size-4" />
                </span>
                <h2 className="mt-4 text-sm font-medium">No entries found</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {hasActiveFilters
                    ? "Try a different period or filter."
                    : "Your tracked time will appear here."}
                </p>
              </div>
            ) : (
              <div className="space-y-7">
                <TimeBreakdownChart
                  entries={filteredEntries}
                  projectMap={projectMap}
                />

                <section>
                  <div className="mb-2 flex items-baseline gap-2">
                    <h2 className="text-sm font-semibold tracking-tight">
                      Activity
                    </h2>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {filteredEntries.length}
                    </span>
                  </div>
                  <div className="divide-y divide-border/60 border-y border-border/60">
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
                </section>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
