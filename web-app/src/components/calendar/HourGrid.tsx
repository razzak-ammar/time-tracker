"use client";

import { HOURS } from "./utils";
import { cn } from "@/lib/utils";

interface HourGridProps {
  hourHeight: number;
  className?: string;
}

export function HourGrid({ hourHeight, className }: HourGridProps) {
  return (
    <>
      {HOURS.map((hour) => (
        <div
          key={hour}
          className={cn(
            "absolute left-0 right-0 border-t border-dashed border-border/40",
            hour === 0 && "border-solid",
            className,
          )}
          style={{ top: hour * hourHeight }}
        />
      ))}
    </>
  );
}
