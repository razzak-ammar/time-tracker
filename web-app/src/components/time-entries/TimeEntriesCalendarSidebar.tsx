"use client";

import * as React from "react";
import { format, isAfter, isSameDay, startOfMonth } from "date-fns";
import {
  ArrowUpRight,
  CalendarX2,
  CalendarDays,
  Clock3,
  LoaderCircle,
  PanelLeftClose,
  X,
} from "lucide-react";

import {
  Calendar,
  CalendarDayButton,
} from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Project, TimeEntry } from "@/types";

type DayActivity = {
  count: number;
  colors: string[];
};

const DayActivityContext = React.createContext<Map<string, DayActivity>>(
  new Map(),
);

function ActivityDayButton({
  day,
  modifiers,
  className,
  ...props
}: React.ComponentProps<typeof CalendarDayButton>) {
  const activityByDay = React.useContext(DayActivityContext);
  const activity = activityByDay.get(format(day.date, "yyyy-MM-dd"));
  const label = format(day.date, "EEEE, MMMM d, yyyy");

  return (
    <CalendarDayButton
      day={day}
      modifiers={modifiers}
      className={cn(
        "relative rounded-full transition-[transform,background-color,color,box-shadow] duration-150 ease-out active:scale-90",
        modifiers.today &&
          !modifiers.selected &&
          "bg-red-500/12 font-semibold text-red-500 ring-1 ring-inset ring-red-500/55 hover:bg-red-500/20",
        modifiers.selected &&
          "scale-105 bg-primary font-semibold text-primary-foreground shadow-sm ring-2 ring-primary/25 hover:bg-primary hover:text-primary-foreground",
        className,
      )}
      {...props}
      title={activity ? `${label} · ${activity.count} entries` : label}
      aria-label={
        activity
          ? `${label}, ${activity.count} time ${activity.count === 1 ? "entry" : "entries"}`
          : label
      }
    >
      {day.date.getDate()}
      {activity && (
        <span
          aria-hidden="true"
          className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 items-center gap-0.5"
        >
          {activity.colors.slice(0, 3).map((color, index) => (
            <span
              key={`${color}-${index}`}
              className="size-1 rounded-full ring-1 ring-background/70"
              style={{ backgroundColor: color }}
            />
          ))}
        </span>
      )}
    </CalendarDayButton>
  );
}

interface TimeEntriesCalendarSidebarProps {
  entries: TimeEntry[];
  projects: Project[];
  selectedDate?: Date;
  onSelectDate: (date?: Date) => void;
  onViewDateInReport: (date: Date) => void;
  isLoading?: boolean;
}

export function TimeEntriesCalendarSidebar({
  entries,
  projects,
  selectedDate,
  onSelectDate,
  onViewDateInReport,
  isLoading = false,
}: TimeEntriesCalendarSidebarProps) {
  const [isOpen, setIsOpen] = React.useState(true);
  const [visibleMonth, setVisibleMonth] = React.useState(
    startOfMonth(selectedDate ?? new Date()),
  );
  const [monthDirection, setMonthDirection] = React.useState<"next" | "previous">(
    "next",
  );
  const [animationKey, setAnimationKey] = React.useState(0);

  const projectColors = React.useMemo(
    () => new Map(projects.map((project) => [project.id, project.color])),
    [projects],
  );

  const activityByDay = React.useMemo(() => {
    const activity = new Map<string, DayActivity>();

    entries.forEach((entry) => {
      const key = format(entry.startTime, "yyyy-MM-dd");
      const current = activity.get(key) ?? { count: 0, colors: [] };
      const color = projectColors.get(entry.projectId) ?? "hsl(var(--primary))";

      current.count += 1;
      if (!current.colors.includes(color)) current.colors.push(color);
      activity.set(key, current);
    });

    return activity;
  }, [entries, projectColors]);

  const selectedDayEntries = React.useMemo(() => {
    if (!selectedDate) return [];
    return entries
      .filter((entry) => isSameDay(entry.startTime, selectedDate))
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }, [entries, selectedDate]);

  const formatDuration = (milliseconds: number) => {
    const minutes = Math.round(milliseconds / 60_000);
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return hours ? `${hours}h ${remainder}m` : `${remainder}m`;
  };

  const handleMonthChange = (month: Date) => {
    setMonthDirection(isAfter(month, visibleMonth) ? "next" : "previous");
    setVisibleMonth(month);
    setAnimationKey((key) => key + 1);
  };

  return (
    <aside
      aria-label="Entry date navigation"
      className={cn(
        "shrink-0 overflow-hidden border-b border-border/60 bg-background transition-[width] duration-300 ease-out md:border-b-0 md:border-r",
        isOpen ? "md:w-[312px]" : "md:w-14",
      )}
    >
      <div
        className={cn(
          "flex h-14 w-full items-center justify-between px-4",
          isOpen ? "md:w-[312px]" : "md:w-14 md:justify-center md:px-0",
        )}
      >
        <div
          className={cn(
            "flex min-w-0 items-center gap-2.5",
            !isOpen && "md:hidden",
          )}
        >
          <CalendarDays className="size-4 text-primary" />
          <span className="text-sm font-semibold tracking-tight">Calendar</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-foreground"
          onClick={() => setIsOpen((open) => !open)}
          aria-label={isOpen ? "Collapse calendar" : "Expand calendar"}
          aria-expanded={isOpen}
        >
          <PanelLeftClose
            className={cn(
              "size-4 transition-transform duration-300",
              !isOpen && "rotate-180",
            )}
          />
        </Button>
      </div>

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 md:block",
          isOpen
            ? "grid-rows-[1fr] opacity-100"
            : "pointer-events-none grid-rows-[0fr] opacity-0 md:hidden",
        )}
      >
        <div className="overflow-hidden">
          <div className="w-full px-4 pb-6 md:w-[312px]">
            <div className="border-t border-border/60 pt-3">
              <DayActivityContext.Provider value={activityByDay}>
                <div
                  key={animationKey}
                  className={cn(
                    "motion-reduce:animate-none",
                    monthDirection === "next"
                      ? "animate-calendar-month-next"
                      : "animate-calendar-month-previous",
                  )}
                >
                  <Calendar
                    mode="single"
                    required
                    month={visibleMonth}
                    selected={selectedDate}
                    onSelect={onSelectDate}
                    onMonthChange={handleMonthChange}
                    components={{ DayButton: ActivityDayButton }}
                    className="w-full bg-transparent p-0 [--cell-size:2.25rem]"
                    classNames={{
                      root: "w-full",
                      month: "flex w-full flex-col gap-3",
                      day: "relative aspect-square w-full p-0 text-center select-none",
                      today:
                        "rounded-md bg-primary/8 font-semibold text-primary data-[selected=true]:rounded-md",
                      outside: "text-muted-foreground/45",
                    }}
                  />
                </div>
              </DayActivityContext.Provider>
            </div>

            {selectedDate && (
              <section
                key={format(selectedDate, "yyyy-MM-dd")}
                aria-label={`Entries for ${format(selectedDate, "MMMM d")}`}
                className="relative mt-3 animate-date-preview pt-2 motion-reduce:animate-none"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 size-7 rounded-full text-muted-foreground/60 hover:bg-muted/50 hover:text-foreground"
                  onClick={() => onSelectDate(undefined)}
                  aria-label="Close day preview"
                  title="Close day preview"
                >
                  <X className="size-3.5" />
                </Button>

                {isLoading ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground" role="status">
                    <LoaderCircle className="size-4 animate-spin text-primary" />
                    Loading entries…
                  </div>
                ) : selectedDayEntries.length === 0 ? (
                  <div className="flex flex-col items-center px-8 py-8 text-center">
                    <span className="flex size-10 items-center justify-center rounded-full bg-muted/35 text-muted-foreground/45">
                      <CalendarX2 className="size-4.5" />
                    </span>
                    <p className="mt-3 text-xs font-normal text-muted-foreground/65">
                      No tracked time on this day
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5 pr-8">
                    {selectedDayEntries.slice(0, 4).map((entry) => {
                      const project = projects.find(
                        (candidate) => candidate.id === entry.projectId,
                      );
                      return (
                        <div
                          key={entry.id}
                          className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors duration-150 hover:bg-muted/45"
                        >
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: project?.color }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium">
                              {project?.name ?? "Unknown project"}
                            </p>
                            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Clock3 className="size-3" />
                              {format(entry.startTime, "h:mm a")} – {entry.endTime ? format(entry.endTime, "h:mm a") : "Now"}
                            </p>
                          </div>
                          <span className="text-[11px] font-medium text-muted-foreground">
                            {formatDuration((entry.endTime ?? new Date()).getTime() - entry.startTime.getTime())}
                          </span>
                        </div>
                      );
                    })}
                    {selectedDayEntries.length > 4 && (
                      <p className="px-2.5 pt-1 text-[11px] text-muted-foreground">
                        +{selectedDayEntries.length - 4} more entries
                      </p>
                    )}
                  </div>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="group mt-4 h-10 w-full justify-between rounded-xl px-2 pl-3 text-xs font-medium text-muted-foreground transition-[background-color,color,transform] hover:bg-muted/55 hover:text-foreground active:scale-[0.99]"
                  onClick={() => onViewDateInReport(selectedDate)}
                  disabled={isLoading}
                >
                  Open daily report
                  <span className="flex size-7 items-center justify-center rounded-full bg-foreground text-background transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                    <ArrowUpRight className="size-3.5" />
                  </span>
                </Button>
              </section>
            )}
          </div>
        </div>
      </div>

      {!isOpen && (
        <div className="hidden flex-col items-center gap-3 md:flex">
          <span className="h-px w-5 bg-border" />
          <span className="[writing-mode:vertical-rl] text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Dates
          </span>
        </div>
      )}
    </aside>
  );
}
