"use client";

import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface WeekDayMeta {
  totalMs: number;
  projectColors: string[];
}

interface WeekDayButtonProps {
  day: Date;
  isFocused: boolean;
  isToday: boolean;
  meta?: WeekDayMeta;
  onSelect: (date: Date) => void;
}

export function WeekDayButton({
  day,
  isFocused,
  isToday,
  meta,
  onSelect,
}: WeekDayButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(day)}
      className={cn(
        "relative flex flex-col items-center justify-center px-3 py-1 rounded-full min-w-[60px] transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        "bg-transparent hover:bg-muted/50",
      )}
    >
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground/80">
        {format(day, "EEE")}
      </span>
      <div
        className={cn(
          "relative mt-1 flex items-center justify-center w-9 h-9 rounded-full border text-sm font-semibold transition-colors",
          isFocused
            ? "bg-primary ring-1 ring-primary/50 text-primary-foreground border-primary/80 shadow-md"
            : "border-border/60 text-foreground bg-background",
          isToday && "bg-red-500",
        )}
      >
        {format(day, "d")}
      </div>

      {meta?.projectColors && meta.projectColors.length > 0 && (
        <div className="mt-2 flex gap-1">
          {meta.projectColors.slice(0, 4).map((color) => (
            <span
              key={color}
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      )}
    </button>
  );
}
