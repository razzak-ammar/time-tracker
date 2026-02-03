"use client";

import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface WeekNavProps {
  focusedDate: Date;
  onWeekChange?: (direction: "prev" | "next") => void;
  /** When true, render compact (arrows + month year only) */
  compact?: boolean;
}

export function WeekNav({
  focusedDate,
  onWeekChange,
  compact = false,
}: WeekNavProps) {
  const monthLabel = format(focusedDate, "MMMM");
  const yearLabel = format(focusedDate, "yyyy");

  if (compact) {
    return (
      <div className="flex items-center gap-1 shrink-0">
        {onWeekChange && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onWeekChange("prev")}
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onWeekChange("next")}
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}
        <span className="text-lg font-semibold tracking-tight whitespace-nowrap">
          {monthLabel} {yearLabel}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-4">
      {onWeekChange && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onWeekChange("prev")}
          aria-label="Previous week"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      <div className="flex flex-col items-center">
        <span className="text-sm font-medium tracking-wide text-muted-foreground">
          {yearLabel}
        </span>
        <span className="text-2xl font-semibold tracking-tight">
          {monthLabel}
        </span>
      </div>

      {onWeekChange && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onWeekChange("next")}
          aria-label="Next week"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
