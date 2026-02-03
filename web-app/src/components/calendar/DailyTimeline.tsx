"use client";

import { useMemo, useRef, useCallback, useEffect, useState } from "react";
import { TimeEntry, Project } from "@/types";
import {
  startOfDay,
  endOfDay,
  differenceInMinutes,
  isBefore,
  isAfter,
  max,
  min,
  isSameDay,
  format,
} from "date-fns";
import { cn } from "@/lib/utils";
import { HOURS, MIN_HOUR_HEIGHT, MAX_HOUR_HEIGHT, clamp } from "./utils";
import { HourGrid } from "./HourGrid";
import { NowIndicator } from "./NowIndicator";
import { TimelineResizeHandle } from "./TimelineResizeHandle";
import { TimelineEntryBlock } from "./TimelineEntryBlock";
import { QuickEntryPopup } from "./QuickEntryPopup";

interface DailyTimelineProps {
  date: Date;
  entries: TimeEntry[];
  projects: Project[];
  hourHeight: number;
  onHourHeightChange?: (newHeight: number) => void;
  /** Called when an entry is moved or resized (drag/resize on block) */
  onUpdateEntry?: (
    id: string,
    updates: { startTime?: Date; endTime?: Date },
  ) => void;
  /** When true, render only the day column (no hour labels, no scroll). Use with a shared timeline layout. */
  sharedTimeline?: boolean;
  /** When true and sharedTimeline, show the vertical resize handle for hour height. */
  showResizeHandle?: boolean;
}

interface TimelineEntryBlockData {
  id: string;
  top: number;
  height: number;
  projectName: string;
  color: string;
  startLabel: string;
  endLabel: string;
  description?: string;
  isActive: boolean;
  startTime: Date;
  endTime: Date;
}

/** Shared hour labels for multi-day timeline. Use once on the left of multiple DailyTimeline columns. */
export function TimelineHourLabels({ hourHeight }: { hourHeight: number }) {
  return (
    <div className="w-16 shrink-0 border-r border-border/60 bg-muted/40 text-xs text-muted-foreground select-none">
      <div className="relative" style={{ height: 24 * hourHeight }}>
        {HOURS.map((hour) => (
          <div
            key={hour}
            className="absolute left-0 right-0 flex items-start justify-end pr-2"
            style={{ top: hour * hourHeight }}
          >
            <span className="translate-y-[-50%]">
              {format(new Date(0, 0, 0, hour), "ha")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DailyTimeline({
  date,
  entries,
  projects,
  hourHeight,
  onHourHeightChange,
  onUpdateEntry,
  sharedTimeline = false,
  showResizeHandle = false,
}: DailyTimelineProps) {
  const isToday = isSameDay(date, new Date());
  const isResizingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(hourHeight);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const hasAutoScrolledRef = useRef(false);
  const [now, setNow] = useState(new Date());

  const [quickEntryOpen, setQuickEntryOpen] = useState(false);
  const [quickEntryDate, setQuickEntryDate] = useState(date);
  const [quickEntryStartMinutes, setQuickEntryStartMinutes] = useState(0);
  const columnRef = useRef<HTMLDivElement | null>(null);

  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  const timelineEntries = useMemo((): TimelineEntryBlockData[] => {
    const blocks: TimelineEntryBlockData[] = [];

    entries.forEach((entry) => {
      const project = projectMap.get(entry.projectId);
      if (!project) return;

      const entryEndRaw = entry.endTime ?? new Date();
      const clampedStart = max([entry.startTime, dayStart]);
      const clampedEnd = min([entryEndRaw, dayEnd]);

      if (
        isAfter(clampedStart, dayEnd) ||
        isBefore(clampedEnd, dayStart) ||
        !clampedEnd ||
        !clampedStart
      ) {
        return;
      }

      const durationMinutes = Math.max(
        1,
        differenceInMinutes(clampedEnd, clampedStart),
      );
      const minutesFromStart = differenceInMinutes(clampedStart, dayStart);

      const top = (minutesFromStart / 60) * hourHeight;
      const height = (durationMinutes / 60) * hourHeight;

      blocks.push({
        id: entry.id,
        top,
        height,
        projectName: project.name,
        color: project.color,
        startLabel: format(entry.startTime, "h:mm a"),
        endLabel: entry.endTime ? format(entry.endTime, "h:mm a") : "Now",
        description: entry.description,
        isActive: entry.isActive,
        startTime: entry.startTime,
        endTime: entryEndRaw,
      });
    });

    return blocks.sort((a, b) => a.top - b.top);
  }, [entries, projectMap, hourHeight, dayStart, dayEnd]);

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!isResizingRef.current) return;
      const deltaY = event.clientY - startYRef.current;
      const nextHeight = clamp(
        startHeightRef.current + deltaY / 4,
        MIN_HOUR_HEIGHT,
        MAX_HOUR_HEIGHT,
      );
      onHourHeightChange?.(nextHeight);
    },
    [onHourHeightChange],
  );

  const handlePointerMoveRef = useRef(handlePointerMove);
  handlePointerMoveRef.current = handlePointerMove;

  const stablePointerMove = useCallback((e: PointerEvent) => {
    handlePointerMoveRef.current(e);
  }, []);

  const handlePointerUp = useCallback(() => {
    isResizingRef.current = false;
    window.removeEventListener("pointermove", stablePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
  }, [stablePointerMove]);

  const handleResizeStart = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      isResizingRef.current = true;
      startYRef.current = event.clientY;
      startHeightRef.current = hourHeight;
      window.addEventListener("pointermove", stablePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [hourHeight, stablePointerMove, handlePointerUp],
  );

  const handleColumnDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = columnRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const scrollTop = el.closest(".overflow-y-auto")?.scrollTop ?? 0;
      const totalY = y + scrollTop;
      const minutesFromMidnight = Math.max(
        0,
        Math.min(24 * 60 - 1, Math.round((totalY / hourHeight) * 60)),
      );
      setQuickEntryDate(date);
      setQuickEntryStartMinutes(minutesFromMidnight);
      setQuickEntryOpen(true);
    },
    [date, hourHeight],
  );

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", stablePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [stablePointerMove, handlePointerUp]);

  useEffect(() => {
    if (!isToday) return;
    const interval = setInterval(() => {
      setNow(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, [isToday]);

  const minutesSinceStart = differenceInMinutes(now, dayStart);
  const nowOffset =
    isToday && minutesSinceStart >= 0 && minutesSinceStart <= 24 * 60
      ? (minutesSinceStart / 60) * hourHeight
      : null;

  useEffect(() => {
    if (sharedTimeline) return;
    hasAutoScrolledRef.current = false;
  }, [date, sharedTimeline]);

  useEffect(() => {
    if (sharedTimeline || !isToday) return;
    if (nowOffset === null) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    if (hasAutoScrolledRef.current) return;

    const target =
      nowOffset - container.clientHeight / 2 > 0
        ? nowOffset - container.clientHeight / 2
        : 0;
    container.scrollTop = target;
    hasAutoScrolledRef.current = true;
  }, [sharedTimeline, isToday, nowOffset]);

  const timelineColumn = (
    <div
      ref={columnRef}
      className={cn(
        "relative flex-1 min-w-[200px]",
        sharedTimeline && "border-r border-border/40 last:border-r-0",
        onUpdateEntry && "cursor-default",
      )}
      style={{ height: 24 * hourHeight }}
      onDoubleClick={handleColumnDoubleClick}
    >
      <HourGrid hourHeight={hourHeight} />

      {nowOffset !== null && <NowIndicator top={nowOffset} />}

      {timelineEntries.map((block) => (
        <TimelineEntryBlock
          key={block.id}
          id={block.id}
          top={block.top}
          height={block.height}
          projectName={block.projectName}
          color={block.color}
          startLabel={block.startLabel}
          endLabel={block.endLabel}
          description={block.description}
          isActive={block.isActive}
          startTime={block.startTime}
          endTime={block.endTime}
          dayStart={dayStart}
          dayEnd={dayEnd}
          hourHeight={hourHeight}
          onUpdate={onUpdateEntry ?? (() => { })}
          showResizeHandle={showResizeHandle}
        />
      ))}

      {onHourHeightChange && (!sharedTimeline || showResizeHandle) && (
        <TimelineResizeHandle onResizeStart={handleResizeStart} />
      )}
    </div>
  );

  return (
    <>
      {sharedTimeline ? (
        timelineColumn
      ) : (
        <div className="h-full min-h-0 flex flex-col rounded-xl bg-card/60 backdrop-blur-sm overflow-hidden pt-3 pb-2">
          <div
            ref={scrollContainerRef}
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
          >
            <div className="pt-4">
              <div className="flex" style={{ height: 24 * hourHeight }}>
                <TimelineHourLabels hourHeight={hourHeight} />
                <div className="relative flex-1 min-w-0">{timelineColumn}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <QuickEntryPopup
        open={quickEntryOpen}
        onOpenChange={setQuickEntryOpen}
        date={quickEntryDate}
        startMinutes={quickEntryStartMinutes}
      />
    </>
  );
}
