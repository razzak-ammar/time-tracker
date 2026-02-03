"use client";

import { format, isSameDay } from "date-fns";
import { WeekNav } from "./WeekNav";
import { WeekDayButton, type WeekDayMeta } from "./WeekDayButton";

export type { WeekDayMeta };

interface WeekHeaderProps {
  weekDays: Date[];
  focusedDate: Date;
  onSelect: (date: Date) => void;
  onWeekChange?: (direction: "prev" | "next") => void;
  dayMeta: Record<string, WeekDayMeta>;
  /** When true, show only "Month Year" and nav arrows on the left (for week/custom views). */
  compact?: boolean;
}

export function WeekHeader({
  weekDays,
  focusedDate,
  onSelect,
  onWeekChange,
  dayMeta,
  compact = false,
}: WeekHeaderProps) {
  if (compact) {
    return (
      <WeekNav
        focusedDate={focusedDate}
        onWeekChange={onWeekChange}
        compact
      />
    );
  }

  return (
    <div className="w-full space-y-4">
      <WeekNav
        focusedDate={focusedDate}
        onWeekChange={onWeekChange}
      />

      <div className="flex justify-center">
        <div className="flex gap-2 overflow-x-auto pb-1 px-2 max-w-full">
          {weekDays.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const meta = dayMeta[key];
            const isFocused = isSameDay(day, focusedDate);
            const isToday = isSameDay(day, new Date());

            return (
              <WeekDayButton
                key={key}
                day={day}
                isFocused={isFocused}
                isToday={isToday}
                meta={meta}
                onSelect={onSelect}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
