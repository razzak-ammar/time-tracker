"use client";

import { Project, TimeEntry } from "@/types";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Grid, List, Filter } from "lucide-react";
import { useState } from "react";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { Badge } from "@/components/ui/badge";

interface ProjectListProps {
  projects: Project[];
  activeTimeEntry: TimeEntry | null;
  elapsedTime: string;
  onRefresh?: () => void;
}

export function ProjectList({
  projects,
  activeTimeEntry,
  elapsedTime,
  onRefresh,
}: ProjectListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [formOpen, setFormOpen] = useState(false);

  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesPinned = showPinnedOnly ? project.isPinned : true;
    return matchesSearch && matchesPinned;
  });

  const pinnedProjects = projects.filter((project) => project.isPinned);
  const regularProjects = filteredProjects.filter(
    (project) => !project.isPinned,
  );

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 md:gap-4">
        <div className="space-y-1 md:space-y-2">
          <h2 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            Projects
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-xs md:text-base">
            Manage and track your time across different projects and activities
          </p>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPinnedOnly(!showPinnedOnly)}
            className={`transition-all duration-200 text-xs md:text-sm h-8 md:h-9 ${
              showPinnedOnly
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-500 shadow-md"
                : "hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            <Filter className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">
              {showPinnedOnly ? "Show All" : "Pinned Only"}
            </span>
            <span className="sm:hidden">
              {showPinnedOnly ? "All" : "Pinned"}
            </span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            className="hover:bg-gray-50 dark:hover:bg-gray-800 h-8 w-8 md:h-9 md:w-9 p-0"
          >
            {viewMode === "grid" ? (
              <List className="h-3 w-3 md:h-4 md:w-4" />
            ) : (
              <Grid className="h-3 w-3 md:h-4 md:w-4" />
            )}
          </Button>

          <Button
            onClick={() => setFormOpen(true)}
            className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white shadow-md text-xs md:text-sm h-8 md:h-9"
          >
            <Plus className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Add Project</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 md:pl-12 h-9 md:h-12 bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-emerald-500/20 text-sm text-white"
        />
      </div>

      {/* Pinned Projects */}
      {pinnedProjects.length > 0 && !showPinnedOnly && (
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
              {pinnedProjects.length}
            </Badge>
          </div>
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-8 auto-rows-fr"
                : "space-y-4 md:space-y-6"
            }
          >
            {pinnedProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                isActive={activeTimeEntry?.projectId === project.id}
                elapsedTime={
                  activeTimeEntry?.projectId === project.id
                    ? elapsedTime
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* All Projects */}
      {regularProjects.length > 0 && (
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
                {regularProjects.length}
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
            {regularProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                isActive={activeTimeEntry?.projectId === project.id}
                elapsedTime={
                  activeTimeEntry?.projectId === project.id
                    ? elapsedTime
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredProjects.length === 0 && (
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
