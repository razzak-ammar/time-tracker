"use client";

import { Project, ProjectSummary } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Play,
  Square,
  Clock,
  Pin,
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
  projectSummary?: ProjectSummary;
}

const formatDuration = (seconds: number) => {
  const minutes = Math.round(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours > 0 ? `${hours}h ${remainder}m` : `${remainder}m`;
};

export function ProjectCard({
  project,
  isActive = false,
  elapsedTime,
  projectSummary,
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
    if (!window.confirm(`Move “${project.name}” and its time entries to Recently Deleted? You can restore them for 30 days.`)) return;
    await deleteProject(project.id);
  };

  const totalDuration = formatDuration(
    projectSummary?.completedDurationSeconds ?? 0,
  );
  const sessionCount = projectSummary?.completedSessionCount ?? 0;

  const optionsMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 rounded-full p-0 text-muted-foreground hover:bg-background/80 hover:text-foreground md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
          title="Project options"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setOpenEdit(true)}>
          <Pencil className="mr-2 h-4 w-4" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleTogglePin}>
          <Pin className="mr-2 h-4 w-4" />
          {project.isPinned ? "Unpin" : "Pin"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDelete} className="text-red-600">
          <Trash2 className="mr-2 h-4 w-4" /> Move to Recently Deleted
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const trackingButton = (
    <Button
      variant={isActive ? "destructive" : "default"}
      size="sm"
      onClick={handleToggleTracking}
      disabled={loading}
      className={cn(
        "h-9 rounded-full px-3 text-xs font-medium shadow-none transition-[background-color,color,transform] duration-200 active:scale-95 md:px-4",
        project.isPinned && "w-full justify-center rounded-xl",
        isActive
          ? "bg-foreground text-background hover:bg-foreground/85"
          : "bg-emerald-500 text-white hover:bg-emerald-400",
      )}
    >
      {isActive ? (
        <>
          <Square className="mr-1.5 h-3 w-3 fill-current" /> Stop
        </>
      ) : (
        <>
          <Play className="mr-1.5 h-3 w-3 fill-current" /> Start
        </>
      )}
    </Button>
  );

  return (
    <article
      className={cn(
        "group relative w-full overflow-hidden rounded-2xl border border-border/50 bg-transparent transition-[background-color,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-border hover:bg-muted/35",
        project.isPinned &&
          "flex aspect-square flex-col border-foreground/15 bg-muted/25 p-5 hover:border-foreground/25 hover:bg-muted/40",
        !project.isPinned &&
          "flex min-h-24 items-center gap-3 p-3 md:min-h-28 md:p-4",
        isActive &&
          "border-emerald-500/35 bg-emerald-500/[0.06] hover:border-emerald-500/50 hover:bg-emerald-500/[0.08]",
      )}
    >
      {isActive && (
        <div className="absolute inset-y-4 left-0 w-0.5 rounded-full bg-emerald-400" />
      )}

      {project.isPinned ? (
        <>
          <div className="flex items-start gap-3">
            <span
              className="mt-1 size-2.5 shrink-0 rounded-full ring-4 ring-black/[0.03] dark:ring-white/[0.04]"
              style={{ backgroundColor: project.color }}
            />
            <h3 className="min-w-0 flex-1 truncate text-base font-medium">
              {project.name}
            </h3>
            {optionsMenu}
          </div>

          <div className="mt-auto pt-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Total tracked
            </p>
            <p className="mt-1 text-3xl font-semibold tracking-[-0.04em] tabular-nums">
              {totalDuration}
            </p>
            <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                {sessionCount} {sessionCount === 1 ? "session" : "sessions"}
              </span>
              {isActive && elapsedTime && (
                <span className="flex items-center gap-1 font-medium tabular-nums text-emerald-500">
                  <Clock className="size-3" /> {elapsedTime}
                </span>
              )}
            </div>
          </div>

          <div className="mt-5">{trackingButton}</div>
        </>
      ) : (
        <>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span
              className="size-2.5 shrink-0 rounded-full ring-4 ring-black/[0.03] dark:ring-white/[0.04]"
              style={{ backgroundColor: project.color }}
            />
            <div className="min-w-0">
              <h3 className="truncate text-sm font-medium md:text-base">
                {project.name}
              </h3>
              {isActive && elapsedTime && (
                <span className="mt-1 flex items-center gap-1 text-xs font-medium tabular-nums text-emerald-500">
                  <Clock className="size-3" /> {elapsedTime}
                </span>
              )}
              <p className="mt-1 text-[10px] tabular-nums text-muted-foreground sm:hidden">
                {totalDuration}
                <span className="mx-1 text-border">·</span>
                {sessionCount} {sessionCount === 1 ? "session" : "sessions"}
              </p>
            </div>
          </div>

          <div className="hidden min-w-24 text-right sm:block">
            <p className="text-sm font-semibold tabular-nums">{totalDuration}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {sessionCount} {sessionCount === 1 ? "session" : "sessions"}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {optionsMenu}
            {trackingButton}
          </div>
        </>
      )}

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
    </article>
  );
}
