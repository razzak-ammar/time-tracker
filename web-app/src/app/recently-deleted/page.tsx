"use client";

import { useEffect, useMemo, useState } from "react";
import { format, differenceInCalendarDays } from "date-fns";
import { ArchiveRestore, CalendarClock, LoaderCircle, RotateCcw, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { Project, TimeEntry } from "@/types";
import {
  permanentlyDeleteTrash,
  restoreProject,
  restoreTimeEntry,
  subscribeToDeletedProjects,
  subscribeToDeletedTimeEntries,
} from "@/lib/firebase-service";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type PendingAction = { type: "project" | "timeEntry"; id: string; label: string } | null;

function daysRemaining(purgeAt?: Date) {
  if (!purgeAt) return 30;
  return Math.max(0, differenceInCalendarDays(purgeAt, new Date()));
}

function retentionLabel(purgeAt?: Date) {
  const days = daysRemaining(purgeAt);
  return days === 0 ? "Expires today" : `${days} day${days === 1 ? "" : "s"} remaining`;
}

function EmptyState() {
  return (
    <div className="border-t border-border/60 py-20 text-center">
      <ArchiveRestore className="mx-auto size-7 text-muted-foreground/70" />
      <h2 className="mt-4 text-base font-medium">Nothing in Recently Deleted</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
        Items moved here stay recoverable for 30 days before they are permanently removed.
      </p>
    </div>
  );
}

interface RecoveryRowProps {
  title: string;
  detail: string;
  purgeAt?: Date;
  color?: string;
  loading: boolean;
  onRestore: () => void;
  onRemove: () => void;
}

function RecoveryRow({ title, detail, purgeAt, color, loading, onRestore, onRemove }: RecoveryRowProps) {
  return (
    <li className="group flex flex-col gap-3 border-b border-border/60 py-4 transition-colors last:border-b-0 hover:bg-muted/30 sm:flex-row sm:items-center sm:gap-4 sm:px-3">
      <span
        className="mt-1.5 size-2.5 shrink-0 rounded-full ring-4 ring-black/[0.03] dark:ring-white/[0.04]"
        style={{ backgroundColor: color ?? "hsl(var(--muted-foreground))" }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{detail}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="mr-auto text-xs tabular-nums text-amber-700 dark:text-amber-300 sm:mr-1">
          {retentionLabel(purgeAt)}
        </span>
        <Button size="sm" onClick={onRestore} disabled={loading} className="h-8 bg-emerald-600 px-3 text-xs text-white hover:bg-emerald-500">
          {loading ? <LoaderCircle className="mr-1.5 size-3.5 animate-spin" /> : <RotateCcw className="mr-1.5 size-3.5" />}
          Restore
        </Button>
        <Button variant="ghost" size="icon" onClick={onRemove} disabled={loading} className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Permanently remove ${title}`}>
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </li>
  );
}

export default function RecentlyDeletedPage() {
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [pending, setPending] = useState<PendingAction>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setProjects([]);
      setEntries([]);
      return;
    }
    const stopProjects = subscribeToDeletedProjects(user.uid, setProjects);
    const stopEntries = subscribeToDeletedTimeEntries(user.uid, setEntries);
    return () => {
      stopProjects();
      stopEntries();
    };
  }, [user]);

  const sortedProjects = useMemo(() => [...projects].sort((a, b) => (b.deletedAt?.getTime() ?? 0) - (a.deletedAt?.getTime() ?? 0)), [projects]);
  const projectDeletionIds = useMemo(
    () => new Set(projects.map((project) => project.deletionId).filter(Boolean)),
    [projects],
  );
  const sortedEntries = useMemo(
    () => entries
      .filter((entry) => !entry.deletionId || !projectDeletionIds.has(entry.deletionId))
      .sort((a, b) => (b.deletedAt?.getTime() ?? 0) - (a.deletedAt?.getTime() ?? 0)),
    [entries, projectDeletionIds],
  );
  const itemCount = projects.length + sortedEntries.length;

  const restore = async (type: "project" | "timeEntry", id: string) => {
    setBusyId(id);
    setActionError(null);
    try {
      if (type === "project") await restoreProject(id);
      else await restoreTimeEntry(id);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "This item could not be restored.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    if (!pending) return;
    setBusyId(pending.id);
    setActionError(null);
    try {
      await permanentlyDeleteTrash(pending.type, pending.id);
      setPending(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "This item could not be removed.");
    } finally {
      setBusyId(null);
    }
  };

  if (authLoading) return null;

  return (
    <main className="mx-auto w-full max-w-[1040px] px-4 py-7 md:px-8 md:py-10">
      <header className="border-b border-border/70 pb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <CalendarClock className="size-4" />
              <span className="text-xs font-medium uppercase tracking-[0.14em]">Recovery window</span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Recently Deleted</h1>
            <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
              Restore a project with its associated time entries, or recover an individual entry. Items are removed automatically after 30 days.
            </p>
          </div>
          {itemCount > 0 && <span className="pt-1 text-sm tabular-nums text-muted-foreground">{itemCount} item{itemCount === 1 ? "" : "s"}</span>}
        </div>
      </header>

      {actionError && (
        <p role="alert" className="mt-4 border-l-2 border-destructive pl-3 text-sm text-destructive">
          {actionError}
        </p>
      )}

      {itemCount === 0 ? <EmptyState /> : (
        <div className="mt-7 space-y-9">
          {sortedProjects.length > 0 && (
            <section aria-labelledby="deleted-projects-heading">
              <div className="mb-2 flex items-baseline justify-between">
                <h2 id="deleted-projects-heading" className="text-sm font-medium">Projects</h2>
                <span className="text-xs text-muted-foreground">Restoring returns linked entries</span>
              </div>
              <ul>
                {sortedProjects.map((project) => (
                  <RecoveryRow
                    key={project.id}
                    title={project.name}
                    detail={`Deleted ${project.deletedAt ? format(project.deletedAt, "MMM d, yyyy") : "recently"}`}
                    color={project.color}
                    purgeAt={project.purgeAt}
                    loading={busyId === project.id}
                    onRestore={() => restore("project", project.id)}
                    onRemove={() => setPending({ type: "project", id: project.id, label: project.name })}
                  />
                ))}
              </ul>
            </section>
          )}
          {sortedEntries.length > 0 && (
            <section aria-labelledby="deleted-entries-heading">
              <h2 id="deleted-entries-heading" className="mb-2 text-sm font-medium">Time entries</h2>
              <ul>
                {sortedEntries.map((entry) => (
                  <RecoveryRow
                    key={entry.id}
                    title={entry.description?.trim() || "Untitled time entry"}
                    detail={`${format(entry.startTime, "MMM d, yyyy · h:mm a")}${entry.endTime ? ` – ${format(entry.endTime, "h:mm a")}` : " · Was running"}`}
                    purgeAt={entry.purgeAt}
                    loading={busyId === entry.id}
                    onRestore={() => restore("timeEntry", entry.id)}
                    onRemove={() => setPending({ type: "timeEntry", id: entry.id, label: entry.description?.trim() || "this time entry" })}
                  />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <Dialog open={Boolean(pending)} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Permanently remove {pending?.label}?</DialogTitle>
            <DialogDescription>
              This cannot be undone. A project removal also permanently removes its associated time entries.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)} disabled={Boolean(busyId)}>Cancel</Button>
            <Button variant="destructive" onClick={remove} disabled={Boolean(busyId)}>
              {busyId ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <Trash2 className="mr-2 size-4" />}
              Remove permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
