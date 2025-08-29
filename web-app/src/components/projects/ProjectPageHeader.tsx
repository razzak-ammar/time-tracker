import { Button } from "@/components/ui/button";
import { Filter, List, Grid, Plus } from "lucide-react";

interface ProjectPageHeaderProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
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
    <div className="space-y-4 md:space-y-6 w-full">
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

      {/* <div className="relative max-w-md">
        <Search className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 md:pl-12 h-9 md:h-12 bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-emerald-500/20 text-sm text-white"
        />
      </div> */}
    </div>
  );
}
