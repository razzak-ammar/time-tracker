"use client";

import { Project, ProjectSummary, TimeEntry } from "@/types";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ProjectForm } from "@/components/projects/ProjectForm";

interface ProjectListProps {
  projects: Project[];
  activeTimeEntry: TimeEntry | null;
  elapsedTime: string;
  onRefresh?: () => void;
  showPinnedOnly: boolean;
  viewMode: "grid" | "list";
  projectSummaries: Map<string, ProjectSummary>;
  setFormOpen: (open: boolean) => void;
  formOpen: boolean;
}

export function ProjectList({
  projects,
  activeTimeEntry,
  elapsedTime,
  onRefresh,
  showPinnedOnly,
  viewMode,
  projectSummaries,
  setFormOpen,
  formOpen,
}: ProjectListProps) {
  const pinned = projects.filter((p) => p.isPinned);
  const regular = projects.filter((p) => !p.isPinned);
  const sections = showPinnedOnly
    ? [{ label: "Pinned", projects: pinned }]
    : [
        { label: "Pinned", projects: pinned },
        { label: "Other projects", projects: regular },
      ];

  return (
    <div className="space-y-10 md:space-y-12">
      {sections.map(
        (section) =>
          section.projects.length > 0 && (
            <section key={section.label} className="space-y-3">
              <div className="flex items-baseline gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {section.label}
                </h2>
                <span className="text-xs tabular-nums text-muted-foreground/60">
                  {section.projects.length}
                </span>
              </div>
              <div
                className={
                  section.label === "Pinned"
                    ? "scrollbar-hide grid grid-flow-col auto-cols-[230px] gap-3 overflow-x-auto pb-1 md:grid-flow-row md:grid-cols-[repeat(auto-fill,240px)] md:auto-cols-auto md:overflow-visible"
                    : viewMode === "grid"
                      ? "grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3"
                      : "grid grid-cols-1 gap-2"
                }
              >
                {section.projects.map((project, index) => (
                  <div
                    key={project.id}
                    className="project-enter h-full"
                    style={{ animationDelay: `${index * 45}ms` }}
                  >
                    <ProjectCard
                      project={project}
                      isActive={activeTimeEntry?.projectId === project.id}
                      elapsedTime={
                        activeTimeEntry?.projectId === project.id
                          ? elapsedTime
                          : undefined
                      }
                      projectSummary={projectSummaries.get(project.id)}
                    />
                  </div>
                ))}
              </div>
            </section>
          ),
      )}

      {(projects.length === 0 || (showPinnedOnly && pinned.length === 0)) && (
        <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-border/70">
          <Plus className="mb-4 h-5 w-5 text-muted-foreground" />
          <h2 className="text-sm font-medium">
            {showPinnedOnly ? "No pinned projects" : "No projects"}
          </h2>
          {!showPinnedOnly && (
            <Button
              onClick={() => setFormOpen(true)}
              variant="ghost"
              className="mt-2 h-8 rounded-full px-3 text-xs text-muted-foreground hover:text-foreground"
            >
              Create project
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
