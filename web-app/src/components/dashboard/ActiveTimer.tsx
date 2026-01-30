"use client";

import { TimeEntry, Project } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Square, Play, Edit, Maximize2 } from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { format } from "date-fns";
import { useState } from "react";
import { updateTimeEntry } from "@/lib/firebase-service";

interface ActiveTimerProps {
  timeEntry: TimeEntry;
  project: Project;
  elapsedTime: string;
  onExpand?: () => void;
}

export function ActiveTimer({
  timeEntry,
  project,
  elapsedTime,
  onExpand,
}: ActiveTimerProps) {
  const { stopTracking } = useTimeTracking();
  const [editOpen, setEditOpen] = useState(false);
  const [startTime, setStartTime] = useState(
    format(timeEntry.startTime, "yyyy-MM-dd'T'HH:mm"),
  );
  const [loading, setLoading] = useState(false);

  const handleStop = async () => {
    await stopTracking();
  };

  const handleSaveStartTime = async () => {
    setLoading(true);
    try {
      await updateTimeEntry(timeEntry.id, {
        startTime: new Date(startTime),
      });
      setEditOpen(false);
    } catch (error) {
      console.error("Error updating start time:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: project.color }}
              />
              <CardTitle className="text-lg sm:text-xl">
                Currently Tracking
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {onExpand && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onExpand}
                  className="h-8 w-8 p-0 rounded-full"
                  aria-label="Expand to full screen"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              )}
              <Badge
                variant="default"
                className="bg-primary text-primary-foreground"
              >
                <Play className="w-3 h-3 mr-1" />
                Active
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-primary mb-2">
              {project.name}
            </div>
            <div className="text-xl sm:text-2xl font-mono text-muted-foreground">
              {elapsedTime}
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-1">
              <span>Started at {format(timeEntry.startTime, "h:mm a")}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditOpen(true)}
                className="h-6 px-2 hover:bg-primary/10"
                aria-label="Edit start time"
              >
                <Edit className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="flex justify-center">
            <Button
              variant="destructive"
              size="lg"
              onClick={handleStop}
              className="px-8 h-12 text-lg"
            >
              <Square className="w-5 h-5 mr-2" />
              Stop Tracking
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md bg-card">
          <DialogHeader>
            <DialogTitle>Edit Start Time</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={loading}
                size="sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveStartTime}
                disabled={loading}
                className="bg-green-900 hover:bg-green-700 text-white"
                size="sm"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
