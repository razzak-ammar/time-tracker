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
import { Check, Clock } from "lucide-react";
import { format } from "date-fns";

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
  const [selectedDateStr, setSelectedDateStr] = useState(format(new Date(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
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
      setSelectedDateStr(format(new Date(), "yyyy-MM-dd"));
    }
  }, [open]);

  const selectedDate = useMemo(
    () => new Date(`${selectedDateStr}T00:00:00`),
    [selectedDateStr]
  );

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
      await createManualEntry(selectedProjectId, startDateTime, endDateTime);
      setStartTime("");
      setEndTime("");
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
                <Input
                  type="date"
                  value={selectedDateStr}
                  onChange={(e) => setSelectedDateStr(e.target.value)}
                  className="h-8 w-full sm:w-44 text-xs rounded-full dark:[color-scheme:dark]"
                />
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
                  <Input
                    id="start-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className={`h-10 text-sm ${errors.startTime ? "border-destructive" : ""
                      }`}
                    placeholder="Start"
                    autoFocus
                  />
                  <span className="text-xs text-muted-foreground">to</span>
                  <Input
                    id="end-time"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className={`h-10 text-sm ${errors.endTime ? "border-destructive" : ""
                      }`}
                    placeholder="End"
                  />
                </div>
              </div>
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
