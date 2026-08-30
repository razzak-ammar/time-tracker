"use client";

import { useState, useEffect } from "react";
import { Project } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createProject, updateProject } from "@/lib/firebase-service";
import { useAuth } from "@/contexts/AuthContext";
import { Check, FolderPlus, LoaderCircle, Pencil, X } from "lucide-react";

interface ProjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  onSuccess?: () => void;
}

const COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#84cc16",
  "#14b8a6",
  "#f59e0b",
  "#6366f1",
  "#424242",
  "#64748b",
  "#0ea5e9",
  "#a855f7",
  "#d946ef",
  "#78716c",
];

export function ProjectForm({
  open,
  onOpenChange,
  project,
  onSuccess,
}: ProjectFormProps) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setColor(project.color);
    } else {
      setName("");
      setColor(COLORS[0]);
    }
  }, [project, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;

    setLoading(true);

    try {
      if (project) {
        await updateProject(project.id, { name: name.trim(), color });
      } else {
        await createProject({
          name: name.trim(),
          color,
          userId: user.uid,
          isPinned: false,
        });
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving project:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="project-form-panel max-w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-3xl border-border/60 bg-[hsl(var(--popover))] p-0 text-[hsl(var(--popover-foreground))] shadow-2xl outline-none sm:max-w-[460px]"
      >
        <div className="flex items-start gap-4 border-b border-border/60 px-6 pb-5 pt-6 sm:px-7 sm:pt-7">
          <span
            className="project-form-icon flex size-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
            style={{ backgroundColor: color }}
          >
            {project ? <Pencil className="size-5" /> : <FolderPlus className="size-5" />}
          </span>
          <DialogHeader className="min-w-0 flex-1 gap-1 text-left">
            <DialogTitle className="text-xl tracking-[-0.025em]">
              {project ? "Edit project" : "New project"}
            </DialogTitle>
            <DialogDescription className="text-xs leading-5">
              {project
                ? "Update how this project appears."
                : "Give your tracked time a clear home."}
            </DialogDescription>
          </DialogHeader>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            aria-label="Close project form"
            className="-mr-2 -mt-2 size-9 shrink-0 rounded-full text-muted-foreground shadow-none hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 px-6 py-6 sm:px-7">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-medium">
                Project name
              </Label>
              <div className="relative">
                <span
                  className="pointer-events-none absolute left-3 top-1/2 size-2.5 -translate-y-1/2 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <Input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Reading"
                  required
                  autoFocus
                  className="h-11 rounded-xl border-border/70 bg-background pl-8 shadow-none transition-[border-color,box-shadow] focus-visible:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500/10"
                />
              </div>
            </div>

            <fieldset className="space-y-3">
              <legend className="text-xs font-medium">Color</legend>
              <div className="grid grid-cols-6 gap-x-3 gap-y-3 sm:grid-cols-9">
                {COLORS.map((colorOption) => {
                  const isSelected = color === colorOption;
                  return (
                    <button
                      key={colorOption}
                      type="button"
                      className={`relative size-9 rounded-full outline-none transition-[transform,box-shadow] duration-200 hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-95 ${
                        isSelected
                          ? "scale-110 shadow-[0_0_0_3px_hsl(var(--popover)),0_0_0_5px_currentColor]"
                          : "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]"
                      }`}
                      style={{
                        backgroundColor: colorOption,
                        color: colorOption,
                      }}
                      onClick={() => setColor(colorOption)}
                      aria-label={`Use ${colorOption}`}
                      aria-pressed={isSelected}
                    >
                      {isSelected && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="flex size-5 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm">
                            <Check className="size-3" />
                          </span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-border/60 bg-muted/20 px-6 py-4 sm:flex-row sm:justify-end sm:px-7">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="h-10 rounded-full px-5 text-sm text-muted-foreground shadow-none hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !name.trim()}
              className="h-10 rounded-full bg-emerald-500 px-5 text-sm font-semibold text-white shadow-none transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-emerald-400 active:translate-y-0"
            >
              {loading ? (
                <LoaderCircle className="mr-2 size-4 animate-spin" />
              ) : (
                <Check className="mr-2 size-4" />
              )}
              {loading ? "Saving" : project ? "Save changes" : "Create project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

