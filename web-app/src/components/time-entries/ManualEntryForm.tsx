"use client";

import { useEffect, useMemo, useState } from "react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, Clock, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
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
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
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
    if (open) {
      setSelectedDate(new Date());
      setDescription("");
    }
  }, [open]);

  const duration = useMemo(() => {
    if (!startTime || !endTime) return null;
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const start = new Date(`${dateStr}T${startTime}`);
      const end = new Date(`${dateStr}T${endTime}`);
      if (end <= start) return null;

      const diffMs = end.getTime() - start.getTime();
      const minutes = Math.round(diffMs / (1000 * 60));
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    } catch {
      return null;
    }
  }, [startTime, endTime, selectedDate]);

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!startTime) newErrors.startTime = "Start time is required";
    if (!endTime) {
      newErrors.endTime = "End time is required";
    } else if (startTime && endTime <= startTime) {
      newErrors.endTime = "End time must be after start time";
    }

    if (!selectedProjectId) newErrors.project = "Please select a project";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const startDateTime = new Date(`${dateStr}T${startTime}`);
      const endDateTime = new Date(`${dateStr}T${endTime}`);
      await createManualEntry(
        selectedProjectId,
        startDateTime,
        endDateTime,
        description || undefined
      );
      setStartTime("");
      setEndTime("");
      setDescription("");
      setErrors({});
      onEntryCreated?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating manual entry:", error);
      setErrors({ project: "Failed to create entry. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onOpenChange(false);
    } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 overflow-hidden sm:max-w-2xl rounded-2xl border shadow-2xl data-[state=open]:slide-in-from-bottom-6 data-[state=closed]:slide-out-to-bottom-6 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 bg-card"
        onKeyDown={handleKeyDown}
      >
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Add manual entry</h2>
                <p className="text-sm text-muted-foreground">
                  Log time quickly without leaving your projects.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Date
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      data-empty={!selectedDate}
                      className={cn(
                        "h-10 w-full sm:w-44 justify-start text-left font-normal text-sm rounded-md",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 bg-primary text-primary-foreground" />
                      {selectedDate ? (
                        format(selectedDate, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-0 border bg-gray-700 shadow-md"
                    align="start"
                  >
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      initialFocus
                      className="!bg-popover rounded-md"
                    />
                  </PopoverContent>
                </Popover>
                <Badge
                  variant="secondary"
                  className="text-xs ml-auto hidden sm:inline-flex"
                >
                  {format(selectedDate, "EEE, MMM d")}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.4fr_1fr]">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Project
                </p>
                <Select
                  value={selectedProjectId}
                  onValueChange={setSelectedProjectId}
                >
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue placeholder="Choose a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem
                        key={project.id}
                        value={project.id}
                        className="text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: project.color }}
                          />
                          {project.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.project && (
                  <p className="text-xs text-destructive mt-1 animate-in fade-in duration-200">
                    {errors.project}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Time range
                </p>
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "h-10 flex-1 justify-start text-left font-normal text-sm",
                          !startTime && "text-muted-foreground",
                          errors.startTime && "border-destructive"
                        )}
                      >
                        <Clock className="mr-2 h-4 w-4 shrink-0" />
                        {startTime ? (
                          format(new Date(`2000-01-01T${startTime}`), "p")
                        ) : (
                          <span>Start time</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <div className="p-3">
                        <Input
                          id="start-time"
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="h-10 text-sm"
                          autoFocus
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                  <span className="text-xs text-muted-foreground shrink-0">to</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "h-10 flex-1 justify-start text-left font-normal text-sm",
                          !endTime && "text-muted-foreground",
                          errors.endTime && "border-destructive"
                        )}
                      >
                        <Clock className="mr-2 h-4 w-4 shrink-0" />
                        {endTime ? (
                          format(new Date(`2000-01-01T${endTime}`), "p")
                        ) : (
                          <span>End time</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <div className="p-3">
                        <Input
                          id="end-time"
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="h-10 text-sm"
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs uppercase tracking-wide text-muted-foreground font-normal">
                Description{" "}
                <span className="text-muted-foreground/70">(optional)</span>
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What did you work on?"
                className="min-h-[72px] resize-none text-sm"
                rows={3}
              />
            </div>

            {(errors.startTime || errors.endTime) && (
              <div className="animate-in fade-in duration-200">
                {errors.startTime && (
                  <p className="text-xs text-destructive mb-1">
                    {errors.startTime}
                  </p>
                )}
                {errors.endTime && (
                  <p className="text-xs text-destructive">
                    {errors.endTime}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {duration && (
              <Badge variant="secondary" className="text-xs w-fit">
                {duration}
              </Badge>
            )}
            <div className="flex gap-2 sm:ml-auto w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                size="sm"
                className="h-9 px-4 text-xs w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  loading || !startTime || !endTime || !selectedProjectId
                }
                size="sm"
                className="h-9 px-4 text-xs w-full sm:w-auto"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1" />
                    Save
                  </>
                ) : (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Save entry
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="hidden sm:flex items-center justify-end text-xs text-muted-foreground">
            <span>
              <kbd className="px-1 py-0.5 bg-muted rounded text-xs">
                ⌘+Enter
              </kbd>{" "}
              to save,{" "}
              <kbd className="px-1 py-0.5 bg-muted rounded text-xs">
                Esc
              </kbd>{" "}
              to cancel
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
