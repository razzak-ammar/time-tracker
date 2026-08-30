"use client";

import { useTimeTracking } from "@/hooks/useTimeTracking";
import { ProjectList } from "@/components/projects/ProjectList";
import { ActiveTimer } from "@/components/dashboard/ActiveTimer";
import { FullScreenTimer } from "@/components/dashboard/FullScreenTimer";
import { useState, useEffect, useRef } from "react";
import { ProjectPageHeader } from "@/components/projects/ProjectPageHeader";
import { useProjectSummaries } from "@/hooks/useReportingSummaries";

export default function DashboardPage() {
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [formOpen, setFormOpen] = useState(false);
  const [fullScreenTimerOpen, setFullScreenTimerOpen] = useState(false);
  const hadActiveEntryRef = useRef(false);

  const { projects, activeTimeEntry, elapsedTime } = useTimeTracking();
  const projectSummaries = useProjectSummaries();

  // Auto-open full-screen timer when a timer becomes active (e.g. user just started one)
  useEffect(() => {
    if (activeTimeEntry && !hadActiveEntryRef.current) {
      setFullScreenTimerOpen(true);
      hadActiveEntryRef.current = true;
    }
    if (!activeTimeEntry) {
      hadActiveEntryRef.current = false;
    }
  }, [activeTimeEntry]);

  // Get the project for the active time entry
  const activeProject = activeTimeEntry
    ? projects.find((project) => project.id === activeTimeEntry.projectId)
    : null;

  return (
    <div className="mx-auto w-full max-w-[1480px] px-4 py-5 md:px-8 md:py-10 lg:px-12 overflow-x-hidden space-y-8">
      {activeTimeEntry && activeProject && fullScreenTimerOpen && (
        <FullScreenTimer
          timeEntry={activeTimeEntry}
          project={activeProject}
          elapsedTime={elapsedTime}
          onMinimize={() => setFullScreenTimerOpen(false)}
        />
      )}
      <ProjectPageHeader
        showPinnedOnly={showPinnedOnly}
        setShowPinnedOnly={setShowPinnedOnly}
        viewMode={viewMode}
        setFormOpen={setFormOpen}
        setViewMode={setViewMode}
      />

      {activeTimeEntry && activeProject && (
        <ActiveTimer
          timeEntry={activeTimeEntry}
          project={activeProject}
          elapsedTime={elapsedTime}
          onExpand={() => setFullScreenTimerOpen(true)}
        />
      )}

      <ProjectList
        projects={projects}
        activeTimeEntry={activeTimeEntry}
        elapsedTime={elapsedTime}
        setFormOpen={setFormOpen}
        formOpen={formOpen}
        showPinnedOnly={showPinnedOnly}
        viewMode={viewMode}
        projectSummaries={projectSummaries}
      />
    </div>
  );
}
