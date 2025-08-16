"use client";

import { Organization } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Square,
  Clock,
  Pin,
  PinOff,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { updateOrganization, deleteOrganization } from "@/lib/firebase-service";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { OrganizationForm } from "@/components/organizations/OrganizationForm";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface OrganizationCardProps {
  organization: Organization;
  isActive?: boolean;
  elapsedTime?: string;
  onEdit?: () => void;
}

export function OrganizationCard({
  organization,
  isActive = false,
  elapsedTime,
  onEdit,
}: OrganizationCardProps) {
  const { startTracking, stopTracking } = useTimeTracking();
  const [openEdit, setOpenEdit] = useState(false);

  const handleToggleTracking = async () => {
    if (isActive) {
      await stopTracking();
    } else {
      await startTracking(organization.id);
    }
  };

  const handleTogglePin = async () => {
    await updateOrganization(organization.id, {
      isPinned: !organization.isPinned,
    });
  };

  const handleDelete = async () => {
    // If deleting the currently active project's session should be prevented, this is where we'd guard.
    await deleteOrganization(organization.id);
  };

  // Generate gradient based on organization color
  const getGradientStyle = (color: string) => {
    const colorMap: { [key: string]: string } = {
      "#ef4444": "from-red-500/20 to-pink-500/20",
      "#f97316": "from-orange-500/20 to-red-500/20",
      "#eab308": "from-yellow-500/20 to-orange-500/20",
      "#22c55e": "from-green-500/20 to-emerald-500/20",
      "#06b6d4": "from-cyan-500/20 to-blue-500/20",
      "#3b82f6": "from-blue-500/20 to-indigo-500/20",
      "#8b5cf6": "from-violet-500/20 to-purple-500/20",
      "#ec4899": "from-pink-500/20 to-rose-500/20",
      "#84cc16": "from-lime-500/20 to-green-500/20",
      "#14b8a6": "from-teal-500/20 to-cyan-500/20",
      "#f59e0b": "from-amber-500/20 to-orange-500/20",
      "#6366f1": "from-indigo-500/20 to-purple-500/20",
    };
    return colorMap[color] || "from-violet-500/20 to-purple-500/20";
  };

  return (
    <Card
      className={cn(
        "w-full min-h-[100px] md:min-h-[120px] group relative overflow-hidden transition-all duration-300 hover:shadow-lg border border-gray-200/20 bg-gradient-to-br from-gray-50/50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-900/50 backdrop-blur-sm rounded-xl",
        isActive &&
          "ring-2 [--tw-ring-color:hsl(var(--ring))] shadow-lg bg-gradient-to-br from-emerald-50/50 to-cyan-50/50 dark:from-emerald-900/20 dark:to-cyan-900/20",
      )}
    >
      {/* Gradient overlay */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${getGradientStyle(
          organization.color,
        )} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
      />

      {/* Active indicator */}
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-cyan-400" />
      )}

      <CardContent className="relative p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 md:gap-4">
          <div className="flex items-center space-x-3 md:space-x-4 flex-1">
            <div
              className="w-5 h-5 md:w-6 md:h-6 rounded-full flex-shrink-0 shadow-md"
              style={{ backgroundColor: organization.color }}
            />
            <div className="flex-1 min-w-0 space-y-1">
              <h3 className="font-semibold text-base md:text-lg truncate text-gray-900 dark:text-white">
                {organization.name}
              </h3>
              {isActive && elapsedTime && (
                <div className="flex items-center space-x-1 text-xs md:text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                  <Clock className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="whitespace-nowrap">{elapsedTime}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 md:space-x-3 flex-shrink-0 mt-2 md:mt-0">
            {organization.isPinned && (
              <Badge
                variant="secondary"
                className="text-xs md:text-sm bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800"
              >
                Pinned
              </Badge>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 md:h-10 md:w-10 p-0"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setOpenEdit(true)}>
                  <Pencil className="h-4 w-4 mr-2" /> Edit Project
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleTogglePin}
              className="h-8 w-8 md:h-10 md:w-10 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {organization.isPinned ? (
                <PinOff className="h-4 w-4 md:h-5 md:w-5" />
              ) : (
                <Pin className="h-4 w-4 md:h-5 md:w-5" />
              )}
            </Button>

            <Button
              variant={isActive ? "destructive" : "default"}
              size="sm"
              onClick={handleToggleTracking}
              className={cn(
                "h-8 md:h-10 px-3 md:px-4 font-medium transition-all duration-200 text-xs md:text-sm",
                isActive
                  ? "bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white shadow-md"
                  : "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white shadow-md",
              )}
            >
              {isActive ? (
                <>
                  <Square className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" />
                  Start
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Edit Project Modal */}
      <OrganizationForm
        open={openEdit}
        onOpenChange={setOpenEdit}
        organization={organization}
      />
    </Card>
  );
}
