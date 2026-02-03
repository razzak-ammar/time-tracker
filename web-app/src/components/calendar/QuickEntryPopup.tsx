"use client";

import { useEffect, useState } from "react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { addMinutes, format, startOfDay } from "date-fns";
import { Project } from "@/types";

const DEFAULT_DURATION_MINUTES = 60;

export interface QuickEntryPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Day column that was double-clicked */
  date: Date;
  /** Minutes from midnight (0–24*60) where the click occurred */
  startMinutes: number;
  onEntryCreated?: () => void;
}

export function QuickEntryPopup({
  open,
  onOpenChange,
  date,
  startMinutes,
  onEntryCreated,
}: QuickEntryPopupProps) {
  const { projects, mostRecentlyUsedProject, createManualEntry } =
    useTimeTracking();
  const [loading, setLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [description, setDescription] = useState("");
  const [startTimeStr, setStartTimeStr] = useState("");
  const [endTimeStr, setEndTimeStr] = useState("");

  const dayStart = startOfDay(date);

  useEffect(() => {
    if (mostRecentlyUsedProject && !selectedProjectId) {
      setSelectedProjectId(mostRecentlyUsedProject.id);
    }
  }, [mostRecentlyUsedProject, selectedProjectId]);

  useEffect(() => {
    if (open) {
      const start = addMinutes(dayStart, startMinutes);
      const end = addMinutes(start, DEFAULT_DURATION_MINUTES);
      setStartTimeStr(format(start, "HH:mm"));
      setEndTimeStr(format(end, "HH:mm"));
      setDescription("");
      if (mostRecentlyUsedProject) {
        setSelectedProjectId(mostRecentlyUsedProject.id);
      }
    }
  }, [open, date, startMinutes, dayStart, mostRecentlyUsedProject]);

  const handleSubmit = async () => {
    if (!selectedProjectId || !startTimeStr || !endTimeStr) return;

    const dateStr = format(date, "yyyy-MM-dd");
    const startDateTime = new Date(`${dateStr}T${startTimeStr}`);
    const endDateTime = new Date(`${dateStr}T${endTimeStr}`);

    if (endDateTime <= startDateTime) return;

    setLoading(true);
    try {
      await createManualEntry(
        selectedProjectId,
        startDateTime,
        endDateTime,
        description.trim() || undefined,
      );
      onEntryCreated?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating entry:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md gap-4">
        <DialogHeader>
          <DialogTitle>New time entry</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Project</Label>
            <Select
              value={selectedProjectId}
              onValueChange={setSelectedProjectId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project: Project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: project.color }}
                      />
                      {project.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start</Label>
              <input
                type="time"
                value={startTimeStr}
                onChange={(e) => setStartTimeStr(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <Label>End</Label>
              <input
                type="time"
                value={endTimeStr}
                onChange={(e) => setEndTimeStr(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you work on?"
              className="min-h-[60px] resize-none text-sm"
              rows={2}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              loading ||
              !selectedProjectId ||
              !startTimeStr ||
              !endTimeStr ||
              new Date(`${format(date, "yyyy-MM-dd")}T${endTimeStr}`) <=
                new Date(`${format(date, "yyyy-MM-dd")}T${startTimeStr}`)
            }
          >
            {loading ? "Saving…" : "Save entry"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
