"use client";

import * as React from "react";
import { format, isAfter, startOfMonth } from "date-fns";
import { CalendarDays, PanelLeftClose } from "lucide-react";

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
      className={cn("relative", className)}
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
}

export function TimeEntriesCalendarSidebar({
  entries,
  projects,
  selectedDate,
  onSelectDate,
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

  const handleMonthChange = (month: Date) => {
    setMonthDirection(isAfter(month, visibleMonth) ? "next" : "previous");
    setVisibleMonth(month);
    setAnimationKey((key) => key + 1);
  };

  return (
    <aside
      aria-label="Entry date navigation"
      className={cn(
        "shrink-0 overflow-hidden border-b border-border/70 bg-card/35 transition-[width] duration-300 ease-out md:border-b-0 md:border-r",
        isOpen ? "md:w-[304px]" : "md:w-14",
      )}
    >
      <div
        className={cn(
          "flex h-14 w-full items-center justify-between px-4",
          isOpen ? "md:w-[304px]" : "md:w-14 md:justify-center md:px-0",
        )}
      >
        <div
          className={cn(
            "flex min-w-0 items-center gap-2.5",
            !isOpen && "md:hidden",
          )}
        >
          <CalendarDays className="size-4 text-primary" />
          <span className="text-sm font-semibold tracking-tight">Entry dates</span>
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
          <div className="w-full px-4 pb-5 md:w-[304px]">
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
                    month={visibleMonth}
                    selected={selectedDate}
                    onSelect={onSelectDate}
                    onMonthChange={handleMonthChange}
                    components={{ DayButton: ActivityDayButton }}
                    className="w-full bg-transparent p-0 [--cell-size:2.15rem]"
                    classNames={{
                      root: "w-full",
                      month: "flex w-full flex-col gap-3",
                      today:
                        "rounded-md bg-primary/8 font-semibold text-primary data-[selected=true]:rounded-md",
                      outside: "text-muted-foreground/45",
                    }}
                  />
                </div>
              </DayActivityContext.Provider>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="size-1.5 rounded-full bg-primary" />
                Dots mark tracked days
              </div>
              {selectedDate && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => onSelectDate(undefined)}
                >
                  Clear
                </Button>
              )}
            </div>
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
