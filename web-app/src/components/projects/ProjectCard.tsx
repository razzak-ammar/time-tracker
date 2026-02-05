"use client";

import { Project } from "@/types";
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
import { updateProject, deleteProject } from "@/lib/firebase-service";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { ProjectForm } from "@/components/projects/ProjectForm";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ProjectCardProps {
  project: Project;
  isActive?: boolean;
  elapsedTime?: string;
}

export function ProjectCard({
  project,
  isActive = false,
  elapsedTime,
}: ProjectCardProps) {
  const { startTracking, stopTracking, activeTimeEntry } = useTimeTracking();
  const [openEdit, setOpenEdit] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleToggleTracking = async () => {
    if (loading) return;
    if (isActive) {
      setLoading(true);
      try {
        await stopTracking();
      } finally {
        setLoading(false);
      }
      return;
    }

    if (activeTimeEntry && activeTimeEntry.projectId !== project.id) {
      setShowSwitchModal(true);
      return;
    }

    setLoading(true);
    try {
      await startTracking(project.id);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePin = async () => {
    await updateProject(project.id, {
      isPinned: !project.isPinned,
    });
  };

  const handleDelete = async () => {
    await deleteProject(project.id);
  };

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
      "#424242": "from-gray-500/20 to-slate-600/20",
      "#64748b": "from-slate-500/20 to-slate-600/20",
      "#0ea5e9": "from-sky-500/20 to-blue-500/20",
      "#a855f7": "from-purple-500/20 to-violet-500/20",
      "#d946ef": "from-fuchsia-500/20 to-pink-500/20",
      "#78716c": "from-stone-500/20 to-zinc-500/20",
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
      <div
        className={`absolute inset-0 bg-gradient-to-br ${getGradientStyle(
          project.color,
        )} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
      />
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-cyan-400" />
      )}

      <CardContent className="relative p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 md:gap-4">
          <div className="flex items-center space-x-2 md:space-x-3 flex-1">
            <div
              className="w-4 h-4 md:w-5 md:h-5 rounded-full flex-shrink-0 shadow-md"
              style={{ backgroundColor: project.color }}
            />
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-base md:text-lg truncate text-gray-900 dark:text-white">
                  {project.name}
                </h3>
                {/* only show on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
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
                </div>
              </div>
              {isActive && elapsedTime && (
                <div className="flex items-center space-x-1 text-xs md:text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                  <Clock className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="whitespace-nowrap">{elapsedTime}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 md:space-x-3 flex-shrink-0 mt-2 md:mt-0">
            {project.isPinned && (
              <Badge
                variant="secondary"
                className="text-xs md:text-sm bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800"
              >
                Pinned
              </Badge>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={handleTogglePin}
              className="h-8 w-8 md:h-10 md:w-10 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {project.isPinned ? (
                <PinOff className="h-4 w-4 md:h-5 md:w-5" />
              ) : (
                <Pin className="h-4 w-4 md:h-5 md:w-5" />
              )}
            </Button>
          </div>
          <Button
            variant={isActive ? "destructive" : "default"}
            size="sm"
            onClick={handleToggleTracking}
            className={cn(
              "h-8 md:h-10 px-3 md:px-4 font-medium transition-all duration-200 text-xs md:text-sm w-full",
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
      </CardContent>

      <ProjectForm
        open={openEdit}
        onOpenChange={setOpenEdit}
        project={project}
      />
      <Dialog open={showSwitchModal} onOpenChange={setShowSwitchModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Switch active project?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              You already have an active timer. Do you want to stop it and start
              tracking
              <span className="font-medium text-foreground">
                {" "}
                {project.name}
              </span>
              ?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowSwitchModal(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  setLoading(true);
                  try {
                    await stopTracking();
                    await startTracking(project.id);
                  } finally {
                    setLoading(false);
                    setShowSwitchModal(false);
                  }
                }}
                disabled={loading}
              >
                Stop current and start new
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
