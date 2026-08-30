"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  CalendarDays,
  ChevronDown,
  Clock3,
  LoaderCircle,
  Trash2,
} from "lucide-react";
import type { Project, TimeEntry } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateTimeEntry, deleteTimeEntry } from "@/lib/firebase-service";
import { cn } from "@/lib/utils";

interface TimeEntryListItemProps {
  timeEntry: TimeEntry;
  project: Project;
  onUpdate?: () => void;
}

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours > 0 ? `${hours}h ${remainder}m` : `${remainder}m`;
};

export function TimeEntryListItem({
  timeEntry,
  project,
  onUpdate,
}: TimeEntryListItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [startTime, setStartTime] = useState(
    format(timeEntry.startTime, "yyyy-MM-dd'T'HH:mm"),
  );
  const [endTime, setEndTime] = useState(
    timeEntry.endTime ? format(timeEntry.endTime, "yyyy-MM-dd'T'HH:mm") : "",
  );
  const [description, setDescription] = useState(timeEntry.description || "");
  const [pendingAction, setPendingAction] = useState<"save" | "delete" | null>(
    null,
  );

  useEffect(() => {
    setStartTime(format(timeEntry.startTime, "yyyy-MM-dd'T'HH:mm"));
    setEndTime(
      timeEntry.endTime ? format(timeEntry.endTime, "yyyy-MM-dd'T'HH:mm") : "",
    );
    setDescription(timeEntry.description || "");
  }, [timeEntry]);

  const duration = Math.round(
    ((timeEntry.endTime ?? new Date()).getTime() -
      timeEntry.startTime.getTime()) /
      60_000,
  );

  const resetEditor = () => {
    setStartTime(format(timeEntry.startTime, "yyyy-MM-dd'T'HH:mm"));
    setEndTime(
      timeEntry.endTime ? format(timeEntry.endTime, "yyyy-MM-dd'T'HH:mm") : "",
    );
    setDescription(timeEntry.description || "");
    setIsExpanded(false);
  };

  const handleSave = async () => {
    const nextStartTime = new Date(startTime);
    const nextEndTime = new Date(endTime);
    if (
      !startTime ||
      !endTime ||
      Number.isNaN(nextStartTime.getTime()) ||
      Number.isNaN(nextEndTime.getTime()) ||
      nextEndTime <= nextStartTime
    ) {
      window.alert("Enter an end time that is after the start time.");
      return;
    }

    setPendingAction("save");
    try {
      await updateTimeEntry(timeEntry.id, {
        startTime: nextStartTime,
        endTime: nextEndTime,
        isActive: false,
        description: description.trim() || undefined,
      });
      onUpdate?.();
      setIsExpanded(false);
    } catch (error) {
      console.error("Error updating time entry:", error);
    } finally {
      setPendingAction(null);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Move this time entry to Recently Deleted? You can restore it for 30 days.")) return;

    setPendingAction("delete");
    try {
      await deleteTimeEntry(timeEntry.id);
      onUpdate?.();
    } catch (error) {
      console.error("Error deleting time entry:", error);
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <article
      className={cn(
        "group overflow-hidden transition-colors duration-200",
        isExpanded ? "bg-muted/20" : "hover:bg-muted/25",
        timeEntry.isActive && "bg-emerald-500/[0.04]",
      )}
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((expanded) => !expanded)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setIsExpanded((expanded) => !expanded);
          }
        }}
        className="flex cursor-pointer items-center gap-3 px-2 py-4 outline-none transition-transform duration-200 group-hover:translate-x-0.5 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-3"
      >
        <span
          className={cn(
            "size-2.5 shrink-0 rounded-full",
            timeEntry.isActive && "animate-pulse ring-4 ring-emerald-500/10",
          )}
          style={{ backgroundColor: project.color }}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-medium">{project.name}</h3>
            {timeEntry.isActive && (
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-500">
                Active
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground md:hidden">
            <span>{format(timeEntry.startTime, "MMM d")}</span>
            <span className="size-0.5 rounded-full bg-muted-foreground/50" />
            <span>
              {format(timeEntry.startTime, "h:mm a")} –{" "}
              {timeEntry.endTime ? format(timeEntry.endTime, "h:mm a") : "Now"}
            </span>
          </div>
          {timeEntry.description && (
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {timeEntry.description}
            </p>
          )}
        </div>

        <div className="hidden min-w-[220px] items-center gap-4 text-xs text-muted-foreground md:flex">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-3.5" />
            {format(timeEntry.startTime, "EEE, MMM d")}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock3 className="size-3.5" />
            {format(timeEntry.startTime, "h:mm a")} –{" "}
            {timeEntry.endTime ? format(timeEntry.endTime, "h:mm a") : "Now"}
          </span>
        </div>

        <span className="min-w-10 text-right text-sm font-semibold tabular-nums">
          {formatDuration(duration)}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-300",
            isExpanded && "rotate-180",
          )}
        />
      </div>

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
          isExpanded
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-5 border-t border-border/50 px-3 pb-5 pt-4 sm:px-8">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label
                  htmlFor={`startTime-${timeEntry.id}`}
                  className="text-xs font-medium"
                >
                  Start time
                </Label>
                <div className="relative">
                  <Input
                    id={`startTime-${timeEntry.id}`}
                    type="datetime-local"
                    value={startTime}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => setStartTime(event.target.value)}
                    className="h-10 rounded-lg border-border bg-background pr-10 shadow-none"
                  />
                  <CalendarDays className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor={`endTime-${timeEntry.id}`}
                  className="text-xs font-medium"
                >
                  End time
                </Label>
                <div className="relative">
                  <Input
                    id={`endTime-${timeEntry.id}`}
                    type="datetime-local"
                    value={endTime}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => setEndTime(event.target.value)}
                    className="h-10 rounded-lg border-border bg-background pr-10 shadow-none"
                  />
                  <CalendarDays className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor={`description-${timeEntry.id}`}
                className="text-xs font-medium"
              >
                Note
              </Label>
              <Textarea
                id={`description-${timeEntry.id}`}
                value={description}
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What did you work on?"
                className="min-h-20 resize-none rounded-lg border-border bg-background shadow-none"
                rows={3}
              />
            </div>

            <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={pendingAction !== null}
                className="mr-auto text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                {pendingAction === "delete" ? (
                  <LoaderCircle className="mr-1.5 size-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-1.5 size-4" />
                )}
                {pendingAction === "delete" ? "Moving" : "Move to Recently Deleted"}
              </Button>

              <Button
                variant="ghost"
                onClick={resetEditor}
                disabled={pendingAction !== null}
                size="sm"
                className="text-muted-foreground"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={pendingAction !== null}
                className="bg-emerald-500 text-white shadow-none hover:bg-emerald-400"
                size="sm"
              >
                {pendingAction === "save" && (
                  <LoaderCircle className="mr-1.5 size-4 animate-spin" />
                )}
                {pendingAction === "save" ? "Saving" : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
