import { Button } from "@/components/ui/button";
import { Filter, List, Grid, Plus } from "lucide-react";

interface ProjectPageHeaderProps {
  showPinnedOnly: boolean;
  setShowPinnedOnly: (value: boolean) => void;
  viewMode: "grid" | "list";
  setViewMode: (value: "grid" | "list") => void;
  setFormOpen: (value: boolean) => void;
}

export function ProjectPageHeader({
  showPinnedOnly,
  setShowPinnedOnly,
  viewMode,
  setViewMode,
  setFormOpen,
}: ProjectPageHeaderProps) {
  return (
    <header className="flex w-full items-center justify-between gap-4 border-b border-border/60 pb-5 md:pb-7">
      <h1 className="text-2xl font-semibold tracking-[-0.035em] md:text-4xl">
        Projects
      </h1>

      <div className="flex items-center gap-1.5 md:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPinnedOnly(!showPinnedOnly)}
            className={`h-9 w-9 rounded-full p-0 shadow-none transition-colors md:w-auto md:px-3 ${
              showPinnedOnly
                ? "border-foreground/20 bg-foreground text-background hover:bg-foreground/90"
                : "border-border/70 bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            title={showPinnedOnly ? "Show all projects" : "Show pinned projects"}
          >
            <Filter className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">
              {showPinnedOnly ? "All" : "Pinned"}
            </span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            className="h-9 w-9 rounded-full border-border/70 bg-transparent p-0 text-muted-foreground shadow-none hover:bg-muted hover:text-foreground"
            title={viewMode === "grid" ? "Use list view" : "Use grid view"}
          >
            {viewMode === "grid" ? (
              <List className="h-4 w-4" />
            ) : (
              <Grid className="h-4 w-4" />
            )}
          </Button>

          <Button
            onClick={() => setFormOpen(true)}
            className="h-9 rounded-full bg-emerald-500 px-3 text-sm font-medium text-white shadow-none hover:bg-emerald-400 md:px-4"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            <span className="hidden sm:inline">Project</span>
            <span className="sm:hidden">Add</span>
          </Button>
      </div>
    </header>
  );
}
