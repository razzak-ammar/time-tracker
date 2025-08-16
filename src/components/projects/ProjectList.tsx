"use client";

import { Project, TimeEntry } from "@/types";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { Badge } from "@/components/ui/badge";

interface ProjectListProps {
  projects: Project[];
  activeTimeEntry: TimeEntry | null;
  elapsedTime: string;
  onRefresh?: () => void;
  searchTerm: string;
  showPinnedOnly: boolean;
  viewMode: "grid" | "list";
  setFormOpen: (open: boolean) => void;
  formOpen: boolean;
}

export function ProjectList({
  projects,
  activeTimeEntry,
  elapsedTime,
  onRefresh,
  searchTerm,
  showPinnedOnly,
  viewMode,
  setFormOpen,
  formOpen,
}: ProjectListProps) {
  const filtered = projects.filter((p) => {
    const matchesSearch = p.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesPinned = showPinnedOnly ? p.isPinned : true;
    return matchesSearch && matchesPinned;
  });

  const pinned = projects.filter((p) => p.isPinned);
  const regular = filtered.filter((p) => !p.isPinned);

  return (
    <div className="space-y-4 md:space-y-6">
      {pinned.length > 0 && !showPinnedOnly && (
        <div className="space-y-3 md:space-y-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-1 h-4 md:h-6 bg-gradient-to-b from-amber-400 to-orange-500 rounded-full" />
            <h3 className="text-base md:text-xl font-semibold text-gray-900 dark:text-white">
              Pinned Projects
            </h3>
            <Badge
              variant="secondary"
              className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-xs"
            >
              {pinned.length}
            </Badge>
          </div>
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-5 md:gap-8 auto-rows-fr"
                : "space-y-4 md:space-y-6"
            }
          >
            {pinned.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                isActive={activeTimeEntry?.projectId === p.id}
                elapsedTime={
                  activeTimeEntry?.projectId === p.id ? elapsedTime : undefined
                }
              />
            ))}
          </div>
        </div>
      )}

      {regular.length > 0 && (
        <div className="space-y-3 md:space-y-4">
          {!showPinnedOnly && (
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-1 h-4 md:h-6 bg-gradient-to-b from-gray-400 to-gray-600 rounded-full" />
              <h3 className="text-base md:text-xl font-semibold text-gray-900 dark:text-white">
                All Projects
              </h3>
              <Badge
                variant="secondary"
                className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 text-xs"
              >
                {regular.length}
              </Badge>
            </div>
          )}
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-8 auto-rows-fr"
                : "space-y-4 md:space-y-6"
            }
          >
            {regular.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                isActive={activeTimeEntry?.projectId === p.id}
                elapsedTime={
                  activeTimeEntry?.projectId === p.id ? elapsedTime : undefined
                }
              />
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-8 md:py-16">
          <div className="w-16 h-16 md:w-24 md:h-24 mx-auto mb-4 md:mb-6 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-full flex items-center justify-center">
            <Plus className="w-8 h-8 md:w-12 md:h-12 text-gray-400" />
          </div>
          <h3 className="text-base md:text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {searchTerm || showPinnedOnly
              ? "No projects found"
              : "No projects yet"}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4 md:mb-6 max-w-md mx-auto text-xs md:text-base">
            {searchTerm || showPinnedOnly
              ? "Try adjusting your search criteria or filters."
              : "Create your first project to start tracking time and boost your productivity!"}
          </p>
          {!searchTerm && !showPinnedOnly && (
            <Button
              onClick={() => setFormOpen(true)}
              className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white shadow-md"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Project
            </Button>
          )}
        </div>
      )}

      <ProjectForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={onRefresh}
      />
    </div>
  );
}
