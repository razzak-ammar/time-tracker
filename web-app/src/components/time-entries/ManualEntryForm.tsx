"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarDays, Check, Clock3, LoaderCircle } from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ManualEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEntryCreated?: () => void;
}

export function ManualEntryDialog({
  open,
  onOpenChange,
  onEntryCreated,
}: ManualEntryDialogProps) {
  const { projects, mostRecentlyUsedProject, createManualEntry } =
    useTimeTracking();
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [description, setDescription] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [errors, setErrors] = useState<{
    startTime?: string;
    endTime?: string;
    project?: string;
  }>({});

  useEffect(() => {
    if (mostRecentlyUsedProject && !selectedProjectId) {
      setSelectedProjectId(mostRecentlyUsedProject.id);
    }
  }, [mostRecentlyUsedProject, selectedProjectId]);

  useEffect(() => {
    if (!open) return;
    setSelectedDate(new Date());
    setStartTime("");
    setEndTime("");
    setDescription("");
    setErrors({});
  }, [open]);

  const duration = useMemo(() => {
    if (!startTime || !endTime) return null;

    const date = format(selectedDate, "yyyy-MM-dd");
    const start = new Date(`${date}T${startTime}`);
    const end = new Date(`${date}T${endTime}`);
    if (end <= start) return null;

    const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return hours > 0 ? `${hours}h ${remainder}m` : `${remainder}m`;
  }, [startTime, endTime, selectedDate]);

  const validateForm = () => {
    const nextErrors: typeof errors = {};

    if (!startTime) nextErrors.startTime = "Choose a start time";
    if (!endTime) {
      nextErrors.endTime = "Choose an end time";
    } else if (startTime && endTime <= startTime) {
      nextErrors.endTime = "End time must be later";
    }
    if (!selectedProjectId) nextErrors.project = "Choose a project";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const date = format(selectedDate, "yyyy-MM-dd");
      await createManualEntry(
        selectedProjectId,
        new Date(`${date}T${startTime}`),
        new Date(`${date}T${endTime}`),
        description || undefined,
      );
      onEntryCreated?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating manual entry:", error);
      setErrors({ project: "Couldn’t save this entry. Try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") onOpenChange(false);
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="manual-entry-panel bottom-0 left-0 top-auto max-h-[calc(100dvh-1rem)] max-w-none translate-x-0 translate-y-0 gap-0 overflow-y-auto rounded-b-none rounded-t-[24px] border-x-0 border-b-0 bg-card p-0 text-foreground shadow-[0_-24px_80px_rgba(0,0,0,0.28)] sm:bottom-auto sm:left-[50%] sm:top-[50%] sm:max-h-[calc(100dvh-3rem)] sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border [&_[data-slot=dialog-close]]:rounded-full [&_[data-slot=dialog-close]]:p-2 [&_[data-slot=dialog-close]]:text-muted-foreground [&_[data-slot=dialog-close]]:hover:bg-muted [&_[data-slot=dialog-close]]:hover:text-foreground"
        onKeyDown={handleKeyDown}
      >
        <div className="border-b border-border/60 px-5 pb-5 pt-6 sm:px-7 sm:pb-6 sm:pt-7">
          <div className="mb-4 h-1 w-10 rounded-full bg-muted-foreground/20 sm:hidden" />
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl border border-emerald-500/15 bg-emerald-500/10 text-emerald-400">
              <Clock3 className="size-[18px]" />
            </div>
            <DialogTitle className="text-xl font-semibold tracking-[-0.025em]">
              New time entry
            </DialogTitle>
            <DialogDescription className="sr-only">
              Add a manual entry to your time log.
            </DialogDescription>
          </div>
        </div>

        <div className="space-y-5 px-5 py-6 sm:px-7">
          <div className="manual-entry-field grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/90">
                Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="group h-11 w-full justify-start rounded-lg border-border bg-background px-3 text-left text-sm font-normal text-foreground shadow-none transition-[background-color,border-color,transform] hover:-translate-y-0.5 hover:border-muted-foreground/40 hover:bg-muted/35"
                  >
                    <CalendarDays className="mr-2.5 size-4 text-muted-foreground transition-colors group-hover:text-emerald-400" />
                    {format(selectedDate, "EEE, MMM d")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="z-[70] w-auto rounded-2xl border-border bg-[hsl(var(--popover))] p-1 text-[hsl(var(--popover-foreground))] shadow-2xl"
                  align="start"
                >
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                    className="rounded-xl"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/90">
                Project
              </Label>
              <Select
                value={selectedProjectId}
                onValueChange={(value) => {
                  setSelectedProjectId(value);
                  setErrors((current) => ({ ...current, project: undefined }));
                }}
              >
                <SelectTrigger
                  className={cn(
                    "h-11 w-full rounded-lg border-border bg-background px-3 text-sm font-normal text-foreground shadow-none transition-[background-color,border-color,transform] hover:-translate-y-0.5 hover:border-muted-foreground/40 hover:bg-muted/35 [&_svg]:text-muted-foreground",
                    errors.project && "border-destructive/70",
                  )}
                >
                  <SelectValue placeholder="Choose project" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/70 shadow-xl">
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
              {errors.project && (
                <p className="manual-entry-error text-xs text-destructive">
                  {errors.project}
                </p>
              )}
            </div>
          </div>

          <div className="manual-entry-field space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-foreground/90">
                Time range
              </Label>
              {duration && (
                <span
                  key={duration}
                  className="manual-entry-duration rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold tabular-nums text-emerald-500"
                >
                  {duration}
                </span>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label
                  htmlFor="start-time"
                  className="text-xs text-muted-foreground"
                >
                  Start time
                </Label>
                <div className="group/time relative">
                  <Clock3 className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within/time:text-emerald-400" />
                  <Input
                    id="start-time"
                    type="time"
                    value={startTime}
                    onChange={(event) => {
                      setStartTime(event.target.value);
                      setErrors((current) => ({
                        ...current,
                        startTime: undefined,
                      }));
                    }}
                    aria-invalid={Boolean(errors.startTime)}
                    className={cn(
                      "manual-time-input h-11 w-full rounded-lg border-border bg-background pl-10 pr-3 text-sm font-normal tabular-nums text-foreground shadow-none transition-[border-color,box-shadow] focus-visible:border-emerald-500/60 focus-visible:ring-2 focus-visible:ring-emerald-500/15",
                      errors.startTime && "border-destructive/70",
                    )}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="end-time"
                  className="text-xs text-muted-foreground"
                >
                  End time
                </Label>
                <div className="group/time relative">
                  <Clock3 className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within/time:text-emerald-400" />
                  <Input
                    id="end-time"
                    type="time"
                    value={endTime}
                    onChange={(event) => {
                      setEndTime(event.target.value);
                      setErrors((current) => ({
                        ...current,
                        endTime: undefined,
                      }));
                    }}
                    aria-invalid={Boolean(errors.endTime)}
                    className={cn(
                      "manual-time-input h-11 w-full rounded-lg border-border bg-background pl-10 pr-3 text-sm font-normal tabular-nums text-foreground shadow-none transition-[border-color,box-shadow] focus-visible:border-emerald-500/60 focus-visible:ring-2 focus-visible:ring-emerald-500/15",
                      errors.endTime && "border-destructive/70",
                    )}
                  />
                </div>
              </div>
            </div>
            {(errors.startTime || errors.endTime) && (
              <p className="manual-entry-error text-xs text-destructive">
                {errors.startTime || errors.endTime}
              </p>
            )}
          </div>

          <div className="manual-entry-field space-y-2">
            <Label
              htmlFor="description"
              className="text-sm font-medium text-foreground/90"
            >
              Note
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                Optional
              </span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What did you work on?"
              className="min-h-20 resize-none rounded-lg border-border bg-background px-3 py-3 text-sm text-foreground shadow-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-emerald-500/60 focus-visible:ring-2 focus-visible:ring-emerald-500/15"
              rows={3}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-border/60 bg-muted/15 px-5 py-4 sm:px-7">
          <span className="hidden text-[11px] text-muted-foreground sm:block">
            <kbd className="rounded-md border border-border/70 bg-background px-1.5 py-0.5 font-mono">
              ⌘↵
            </kbd>{" "}
            to save
          </span>
          <div className="ml-auto flex w-full gap-2 sm:w-auto">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="h-10 flex-1 rounded-full px-5 text-sm text-muted-foreground hover:text-foreground sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="h-10 flex-1 rounded-full bg-emerald-500 px-5 text-sm font-semibold text-white shadow-none transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-emerald-400 active:translate-y-0 sm:flex-none"
            >
              {loading ? (
                <LoaderCircle className="mr-2 size-4 animate-spin" />
              ) : (
                <Check className="mr-2 size-4" />
              )}
              {loading ? "Saving" : "Save entry"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
