"use client";

import { TimeEntry, Project } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Clock, Edit, Trash2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { updateTimeEntry, deleteTimeEntry } from "@/lib/firebase-service";

interface TimeEntryCardProps {
  timeEntry: TimeEntry;
  project: Project;
  onUpdate?: () => void;
}

export function TimeEntryCard({
  timeEntry,
  project,
  onUpdate,
}: TimeEntryCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [startTime, setStartTime] = useState(
    format(timeEntry.startTime, "yyyy-MM-dd'T'HH:mm"),
  );
  const [endTime, setEndTime] = useState(
    timeEntry.endTime ? format(timeEntry.endTime, "yyyy-MM-dd'T'HH:mm") : "",
  );
  const [description, setDescription] = useState(timeEntry.description || "");
  const [loading, setLoading] = useState(false);

  const duration = timeEntry.endTime
    ? Math.round(
        (timeEntry.endTime.getTime() - timeEntry.startTime.getTime()) /
          (1000 * 60),
      )
    : Math.round(
        (new Date().getTime() - timeEntry.startTime.getTime()) / (1000 * 60),
      );

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateTimeEntry(timeEntry.id, {
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : undefined,
        description: description.trim() || undefined,
      });
      onUpdate?.();
      setEditOpen(false);
    } catch (error) {
      console.error("Error updating time entry:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this time entry?")) return;

    setLoading(true);
    try {
      await deleteTimeEntry(timeEntry.id);
      onUpdate?.();
    } catch (error) {
      console.error("Error deleting time entry:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* hover effect on card with transition and background*/}
      <Card className="group relative overflow-hidden hover:shadow-md transition-all duration-300 hover:scale-102 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 h-full">
        {/* Active indicator */}
        {timeEntry.isActive && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-cyan-400" />
        )}
        <CardContent className="p-4 md:p-5 space-y-3">
          {/* Project name row – full width so name is visible */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
                style={{ backgroundColor: project.color }}
              />
              <span
                className="font-medium text-sm leading-tight break-words line-clamp-2"
                title={project.name}
              >
                {project.name}
              </span>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={() => setEditOpen(true)}
              className="h-8 px-2 opacity-0 group-hover:opacity-100 bg-gray-200 hover:bg-gray-300 text-gray-800 flex-shrink-0"
              aria-label="Edit time entry"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </div>

          {/* Status + meta row: badge, date, time range, duration */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs md:text-sm text-muted-foreground">
            <Badge
              variant={timeEntry.isActive ? "default" : "secondary"}
              className="px-2 py-0 text-xs w-fit"
            >
              {timeEntry.isActive ? "Active" : "Done"}
            </Badge>
            <span className="hidden sm:inline">•</span>
            <div className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>{format(timeEntry.startTime, "EEE, MMM d")}</span>
            </div>
            <span className="hidden sm:inline">•</span>
            <div className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>
                {format(timeEntry.startTime, "h:mm a")} —{" "}
                {timeEntry.endTime
                  ? format(timeEntry.endTime, "h:mm a")
                  : "Now"}
              </span>
            </div>
            <span className="hidden sm:inline">•</span>
            <div className="inline-flex items-center gap-1">
              <span className="font-medium text-foreground">
                {formatDuration(duration)}
              </span>
            </div>
          </div>

          {/* Description (clamped) */}
          {timeEntry.description && (
            <div className="text-sm text-muted-foreground line-clamp-2">
              {timeEntry.description}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Time Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <div className="relative">
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="pr-10"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <div className="relative">
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What did you work on?"
                rows={3}
              />
            </div>

            <div className="flex justify-between">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={loading}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>

              <div className="space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setEditOpen(false)}
                  disabled={loading}
                  size="sm"
                >
                  Cancel
                </Button>
                {/* style the button to be green */}
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  className="bg-green-900 hover:bg-green-700 text-white"
                  size="sm"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
