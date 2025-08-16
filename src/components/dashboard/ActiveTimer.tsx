"use client";

import { TimeEntry, Organization } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Square, Clock, Play } from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { format } from "date-fns";

interface ActiveTimerProps {
  timeEntry: TimeEntry;
  organization: Organization;
  elapsedTime: string;
}

export function ActiveTimer({
  timeEntry,
  organization,
  elapsedTime,
}: ActiveTimerProps) {
  const { stopTracking } = useTimeTracking();

  const handleStop = async () => {
    await stopTracking();
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: organization.color }}
            />
            <CardTitle className="text-lg sm:text-xl">
              Currently Tracking
            </CardTitle>
          </div>
          <Badge
            variant="default"
            className="bg-primary text-primary-foreground"
          >
            <Play className="w-3 h-3 mr-1" />
            Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-2xl sm:text-3xl font-bold text-primary mb-2">
            {organization.name}
          </div>
          <div className="text-xl sm:text-2xl font-mono text-muted-foreground">
            {elapsedTime}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            Started at {format(timeEntry.startTime, "h:mm a")}
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
  );
}
