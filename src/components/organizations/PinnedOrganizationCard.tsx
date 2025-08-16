"use client";

import { Organization } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { updateOrganization } from "@/lib/firebase-service";
import { Play, Square, Pin, Clock, MoreVertical } from "lucide-react";
import { formatDuration } from "@/lib/utils";

interface PinnedOrganizationCardProps {
  organization: Organization;
}

export function PinnedOrganizationCard({
  organization,
}: PinnedOrganizationCardProps) {
  const {
    activeTimeEntry,
    startTracking,
    stopTracking,
    getTimeEntriesForOrganization,
  } = useTimeTracking();

  const isActive = activeTimeEntry?.organizationId === organization.id;
  const timeEntries = getTimeEntriesForOrganization(organization.id);
  const totalTime = timeEntries.reduce((total, entry) => {
    const duration = entry.endTime
      ? entry.endTime.getTime() - entry.startTime.getTime()
      : Date.now() - entry.startTime.getTime();
    return total + duration;
  }, 0);

  const handleToggleTracking = async () => {
    if (isActive) {
      await stopTracking();
    } else {
      await startTracking(organization.id);
    }
  };

  const handleUnpin = async () => {
    await updateOrganization(organization.id, { isPinned: false });
  };

  // Generate gradient based on organization color
  const getGradientStyle = (color: string) => {
    const colorMap: { [key: string]: string } = {
      "#ef4444": "from-red-500 to-pink-500",
      "#f97316": "from-orange-500 to-red-500",
      "#eab308": "from-yellow-500 to-orange-500",
      "#22c55e": "from-green-500 to-emerald-500",
      "#06b6d4": "from-cyan-500 to-blue-500",
      "#3b82f6": "from-blue-500 to-indigo-500",
      "#8b5cf6": "from-violet-500 to-purple-500",
      "#ec4899": "from-pink-500 to-rose-500",
      "#84cc16": "from-lime-500 to-green-500",
      "#14b8a6": "from-teal-500 to-cyan-500",
      "#f59e0b": "from-amber-500 to-orange-500",
      "#6366f1": "from-indigo-500 to-purple-500",
    };
    return colorMap[color] || "from-violet-500 to-purple-500";
  };

  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border-0 bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm">
      {/* Gradient overlay */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${getGradientStyle(
          organization.color,
        )} opacity-10 group-hover:opacity-20 transition-opacity duration-300`}
      />

      {/* Active indicator */}
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-cyan-400" />
      )}

      <CardContent className="relative p-4 md:p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4 md:mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 md:gap-3 mb-2">
              <div
                className="w-3 h-3 md:w-4 md:h-4 rounded-full shadow-lg"
                style={{ backgroundColor: organization.color }}
              />
              <Badge
                variant="secondary"
                className="text-xs font-medium bg-white/10 text-white/80 border-white/20"
              >
                <Pin className="w-2 h-2 md:w-3 md:h-3 mr-1" />
                Pinned
              </Badge>
            </div>
            <h3 className="text-lg md:text-2xl font-bold text-white mb-1">
              {organization.name}
            </h3>
            <div className="flex items-center text-white/60 text-xs md:text-sm">
              <Clock className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span>Total: {formatDuration(totalTime)}</span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleUnpin}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white/60 hover:text-white hover:bg-white/10 h-8 w-8 p-0"
          >
            <MoreVertical className="w-3 h-3 md:w-4 md:h-4" />
          </Button>
        </div>

        {/* Action button */}
        <Button
          onClick={handleToggleTracking}
          className={`w-full h-12 md:h-14 text-base md:text-lg font-semibold transition-all duration-300 ${
            isActive
              ? "bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white shadow-lg shadow-red-500/25"
              : "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white shadow-lg shadow-emerald-500/25"
          }`}
        >
          {isActive ? (
            <>
              <Square className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              <span className="hidden sm:inline">Stop Tracking</span>
              <span className="sm:hidden">Stop</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              <span className="hidden sm:inline">Start Tracking</span>
              <span className="sm:hidden">Start</span>
            </>
          )}
        </Button>

        {/* Active timer indicator */}
        {isActive && (
          <div className="mt-3 md:mt-4 p-3 md:p-4 bg-white/5 rounded-lg md:rounded-xl border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-2 h-2 md:w-3 md:h-3 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-xs md:text-sm font-medium text-white">
                  Currently tracking...
                </span>
              </div>
              <div className="text-xs text-white/60">Active</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
