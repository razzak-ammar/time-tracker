"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { endOfDay, format, startOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Clock3,
  LoaderCircle,
  Play,
  RotateCcw,
  Square,
} from "lucide-react";
import { useTimeEntriesWithStatus, useTimeTracking } from "@/hooks/useTimeTracking";
import { TimeEntryListItem } from "@/components/time-entries/TimeEntryListItem";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

type LengthFilter = "any" | "under-30" | "30-60" | "60-120" | "over-120";

const pageSize = 25;

const lengthOptions: { value: LengthFilter; label: string; detail: string }[] = [
  { value: "any", label: "Any length", detail: "No limit" },
  { value: "under-30", label: "Quick", detail: "Under 30m" },
  { value: "30-60", label: "Focused", detail: "30–60m" },
  { value: "60-120", label: "Deep", detail: "1–2h" },
  { value: "over-120", label: "Extended", detail: "2h or more" },
];

const formatDuration = (milliseconds: number) => {
  const minutes = Math.max(0, Math.round(milliseconds / 60_000));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours > 0 ? `${hours}h ${remainder}m` : `${remainder}m`;
};

const matchesLength = (milliseconds: number, filter: LengthFilter) => {
  const minutes = milliseconds / 60_000;
  switch (filter) {
    case "under-30":
      return minutes < 30;
    case "30-60":
      return minutes >= 30 && minutes < 60;
    case "60-120":
      return minutes >= 60 && minutes < 120;
    case "over-120":
      return minutes >= 120;
    default:
      return true;
  }
};

export default function ProjectDetailPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const {
    projects,
    projectsLoading,
    activeTimeEntry,
    startTracking,
    stopTracking,
  } = useTimeTracking();
  const { entries, isLoading: entriesLoading, error } = useTimeEntriesWithStatus();
  const [dateRange, setDateRange] = useState<DateRange>();
  const [lengthFilter, setLengthFilter] = useState<LengthFilter>("any");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [lengthPickerOpen, setLengthPickerOpen] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(pageSize);
  const [timerPending, setTimerPending] = useState(false);

  const project = projects.find((item) => item.id === projectId);
  const isActive = activeTimeEntry?.projectId === projectId;
  const projectEntries = useMemo(
    () => entries.filter((entry) => entry.projectId === projectId),
    [entries, projectId],
  );

  const rangeStart = dateRange?.from ? startOfDay(dateRange.from) : null;
  const rangeEnd = dateRange?.to ? endOfDay(dateRange.to) : null;
  const currentTime = new Date();
  const filteredEntries = projectEntries.filter((entry) => {
    if (rangeStart && entry.startTime < rangeStart) return false;
    if (rangeEnd && entry.startTime > rangeEnd) return false;

    const duration = (entry.endTime ?? currentTime).getTime() - entry.startTime.getTime();
    return matchesLength(duration, lengthFilter);
  });

  const totalTime = filteredEntries.reduce(
    (total, entry) =>
      total + (entry.endTime ?? currentTime).getTime() - entry.startTime.getTime(),
    0,
  );

  const visibleEntries = filteredEntries.slice(0, visibleLimit);
  const hasMoreEvents = visibleEntries.length < filteredEntries.length;
  const filtersActive = Boolean(dateRange?.from || lengthFilter !== "any");
  const isLoading = projectsLoading || entriesLoading;

  const dateLabel = dateRange?.from
    ? dateRange.to
      ? `${format(dateRange.from, "MMM d")} – ${format(dateRange.to, "MMM d")}`
      : `From ${format(dateRange.from, "MMM d")}`
    : "Any date";
  const lengthLabel =
    lengthOptions.find((option) => option.value === lengthFilter)?.label ??
    "Any length";

  const resetFilters = () => {
    setDateRange(undefined);
    setLengthFilter("any");
    setVisibleLimit(pageSize);
  };

  const handleTimer = async () => {
    if (timerPending) return;
    setTimerPending(true);
    try {
      if (isActive) {
        await stopTracking();
        return;
      }

      if (activeTimeEntry) {
        const shouldSwitch = window.confirm(
          "Stop the current timer and start tracking this project?",
        );
        if (!shouldSwitch) return;
        await stopTracking();
      }
      await startTracking(projectId);
    } finally {
      setTimerPending(false);
    }
  };

  if (projectsLoading) {
    return (
      <div className="mx-auto flex w-full max-w-[1180px] flex-1 items-center justify-center px-4 py-16">
        <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
        <span className="sr-only">Loading project</span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <Clock3 className="size-5 text-muted-foreground" />
        <h1 className="mt-4 text-lg font-semibold">Project not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          It may have been moved to Recently Deleted.
        </p>
        <Button asChild variant="outline" className="mt-5 rounded-full shadow-none">
          <Link href="/dashboard">Back to projects</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-7 lg:px-10 lg:py-10">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-3.5" />
        Projects
      </Link>

      <header className="mt-6 flex flex-col gap-6 border-b border-border/60 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span
              className="size-3 shrink-0 rounded-full ring-4 ring-black/[0.03] dark:ring-white/[0.04]"
              style={{ backgroundColor: project.color }}
            />
            <h1 className="truncate text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              {project.name}
            </h1>
          </div>
          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {filtersActive ? "Filtered total" : "Total tracked"}
          </p>
          <p className="mt-1 text-3xl font-semibold tracking-[-0.04em] tabular-nums">
            {isLoading ? "—" : formatDuration(totalTime)}
          </p>
        </div>

        <Button
          onClick={handleTimer}
          disabled={timerPending}
          className={`h-10 rounded-full px-5 text-sm font-semibold shadow-none transition-[background-color,transform] active:scale-95 ${
            isActive
              ? "bg-foreground text-background hover:bg-foreground/85"
              : "bg-emerald-500 text-white hover:bg-emerald-400"
          }`}
        >
          {timerPending ? (
            <LoaderCircle className="mr-2 size-4 animate-spin" />
          ) : isActive ? (
            <Square className="mr-2 size-3.5 fill-current" />
          ) : (
            <Play className="mr-2 size-3.5 fill-current" />
          )}
          {isActive ? "Stop timer" : "Start timer"}
        </Button>
      </header>

      <section aria-labelledby="events-heading" className="pt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="events-heading" className="text-sm font-semibold tracking-tight">
            Events
          </h2>

          <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "h-9 shrink-0 rounded-full bg-muted/45 px-3 text-xs font-medium text-muted-foreground shadow-none transition-[background-color,color,transform] hover:-translate-y-0.5 hover:bg-muted hover:text-foreground",
                    dateRange?.from &&
                      "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15 hover:text-emerald-500",
                  )}
                >
                  <CalendarDays className="mr-1.5 size-3.5" />
                  {dateLabel}
                  {dateRange?.from && (
                    <span className="ml-2 size-1.5 rounded-full bg-emerald-500" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                sideOffset={8}
                className="z-[100] w-auto isolate overflow-hidden rounded-2xl border-border/70 bg-[hsl(var(--popover))] p-0 text-[hsl(var(--popover-foreground))] shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold">Date range</p>
                    <p className="text-[11px] text-muted-foreground">
                      Pick a start and end day
                    </p>
                  </div>
                  {dateRange?.from && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDateRange(undefined);
                        setVisibleLimit(pageSize);
                      }}
                      className="h-7 rounded-full px-2.5 text-[11px] text-muted-foreground"
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <Calendar
                  mode="range"
                  animate
                  selected={dateRange}
                  onSelect={(range) => {
                    setDateRange(range);
                    setVisibleLimit(pageSize);
                  }}
                  numberOfMonths={1}
                  className="rounded-xl bg-[hsl(var(--popover))] [--cell-size:--spacing(9)] [&_button[data-range-end=true]]:bg-emerald-500 [&_button[data-range-start=true]]:bg-emerald-500 [&_button[data-range-middle=true]]:bg-emerald-500/10"
                />
                <div className="flex justify-end border-t border-border/60 px-3 py-2.5">
                  <Button
                    size="sm"
                    onClick={() => setDatePickerOpen(false)}
                    className="h-8 rounded-full bg-[hsl(var(--foreground))] px-4 text-xs text-[hsl(var(--background))] shadow-none hover:opacity-85"
                  >
                    Done
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Popover open={lengthPickerOpen} onOpenChange={setLengthPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "h-9 shrink-0 rounded-full bg-muted/45 px-3 text-xs font-medium text-muted-foreground shadow-none transition-[background-color,color,transform] hover:-translate-y-0.5 hover:bg-muted hover:text-foreground",
                    lengthFilter !== "any" &&
                      "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15 hover:text-emerald-500",
                  )}
                >
                  <Clock3 className="mr-1.5 size-3.5" />
                  {lengthLabel}
                  {lengthFilter !== "any" && (
                    <span className="ml-2 size-1.5 rounded-full bg-emerald-500" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                sideOffset={8}
                className="z-[100] w-72 isolate rounded-2xl border-border/70 bg-[hsl(var(--popover))] p-2.5 text-[hsl(var(--popover-foreground))] shadow-2xl"
              >
                <p className="px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Session length
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {lengthOptions.map((option) => {
                    const selected = option.value === lengthFilter;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setLengthFilter(option.value);
                          setVisibleLimit(pageSize);
                          setLengthPickerOpen(false);
                        }}
                        className={cn(
                          "rounded-xl px-3 py-2.5 text-left outline-none transition-[background-color,color,transform] hover:-translate-y-0.5 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
                          selected && "bg-emerald-500 text-white hover:bg-emerald-400",
                          option.value === "any" && "col-span-2",
                        )}
                      >
                        <span className="block text-xs font-semibold">{option.label}</span>
                        <span
                          className={cn(
                            "mt-0.5 block text-[10px] text-muted-foreground",
                            selected && "text-white/75",
                          )}
                        >
                          {option.detail}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>

            {filtersActive && (
              <Button
                variant="ghost"
                size="icon"
                onClick={resetFilters}
                title="Reset filters"
                aria-label="Reset filters"
                className="size-9 shrink-0 rounded-full text-muted-foreground shadow-none hover:bg-muted hover:text-foreground"
              >
                <RotateCcw className="size-3.5" />
              </Button>
            )}
          </div>
        </div>

        {error ? (
          <div className="mt-4 flex items-start gap-3 border-y border-destructive/20 bg-destructive/5 px-2 py-4 text-sm" role="alert">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div>
              <p className="font-medium">Couldn’t load events</p>
              <p className="mt-1 text-xs text-muted-foreground">Check your connection and refresh the page.</p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="mt-3 space-y-1" role="status" aria-label="Loading events">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-[72px] animate-pulse border-b border-border/50 bg-muted/15" />
            ))}
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="mt-3 flex min-h-56 flex-col items-center justify-center border-y border-border/50 px-4 text-center">
            <Clock3 className="size-4 text-muted-foreground" />
            <h3 className="mt-3 text-sm font-medium">No events found</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {filtersActive ? "Try widening the filters." : "Tracked time for this project will appear here."}
            </p>
          </div>
        ) : (
          <div className="mt-3">
            <div className="divide-y divide-border/60 border-y border-border/60">
              {visibleEntries.map((entry) => (
                <TimeEntryListItem
                  key={entry.id}
                  timeEntry={entry}
                  project={project}
                  showProjectName={false}
                />
              ))}
            </div>
            {hasMoreEvents && (
              <div className="flex justify-center py-6">
                <Button
                  variant="ghost"
                  onClick={() => setVisibleLimit((limit) => limit + pageSize)}
                  className="h-9 rounded-full bg-muted/45 px-4 text-xs font-medium text-muted-foreground shadow-none transition-[background-color,color,transform] hover:-translate-y-0.5 hover:bg-muted hover:text-foreground"
                >
                  Show more events
                </Button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
