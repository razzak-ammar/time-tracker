"use client";

import { useRef, useCallback } from "react";
import { addMinutes, differenceInMinutes } from "date-fns";
import { cn } from "@/lib/utils";
import { toRgba } from "./utils";

const MIN_DURATION_MINUTES = 5;

export interface TimelineEntryBlockProps {
  id: string;
  top: number;
  height: number;
  projectName: string;
  color: string;
  startLabel: string;
  endLabel: string;
  description?: string;
  isActive: boolean;
  /** Used for move/resize calculations */
  startTime: Date;
  endTime: Date;
  dayStart: Date;
  dayEnd: Date;
  hourHeight: number;
  onUpdate: (entryId: string, updates: { startTime?: Date; endTime?: Date }) => void;
  showResizeHandle?: boolean;
}

export function TimelineEntryBlock({
  id,
  top,
  height,
  projectName,
  color,
  startLabel,
  endLabel,
  description,
  isActive,
  startTime,
  endTime,
  dayStart,
  dayEnd,
  hourHeight,
  onUpdate,
  showResizeHandle = false,
}: TimelineEntryBlockProps) {
  const isThin = height < 44;
  const displayHeight = isThin ? Math.max(height, 28) : Math.max(height, 64);

  const dragStartY = useRef(0);
  const dragStartStart = useRef(new Date(0));
  const dragStartEnd = useRef(new Date(0));
  const isDraggingRef = useRef<"move" | "top" | "bottom" | null>(null);

  const clampToDay = useCallback(
    (d: Date) =>
      new Date(
        Math.min(dayEnd.getTime(), Math.max(dayStart.getTime(), d.getTime())),
      ),
    [dayStart, dayEnd],
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      const mode = isDraggingRef.current;
      if (!mode) return;

      const pixelsToMinutes = (dy: number) => (dy / hourHeight) * 60;
      const deltaMinutes = pixelsToMinutes(e.clientY - dragStartY.current);

      if (mode === "move") {
        const newStart = addMinutes(dragStartStart.current, deltaMinutes);
        const duration = differenceInMinutes(
          dragStartEnd.current,
          dragStartStart.current,
        );
        let clampedStart = clampToDay(newStart);
        let clampedEnd = addMinutes(clampedStart, duration);
        if (clampedEnd > dayEnd) {
          clampedEnd = dayEnd;
          clampedStart = addMinutes(clampedEnd, -duration);
          if (clampedStart < dayStart) clampedStart = dayStart;
        } else if (clampedStart < dayStart) {
          clampedStart = dayStart;
          clampedEnd = addMinutes(clampedStart, duration);
          if (clampedEnd > dayEnd) clampedEnd = dayEnd;
        }
        onUpdate(id, { startTime: clampedStart, endTime: clampedEnd });
      } else if (mode === "top") {
        const newStart = addMinutes(dragStartStart.current, deltaMinutes);
        const maxStart = addMinutes(endTime, -MIN_DURATION_MINUTES);
        const clampedStart = clampToDay(
          new Date(
            Math.min(
              maxStart.getTime(),
              Math.max(dayStart.getTime(), newStart.getTime()),
            ),
          ),
        );
        onUpdate(id, { startTime: clampedStart });
      } else {
        const minEnd = addMinutes(startTime, MIN_DURATION_MINUTES);
        const newEnd = addMinutes(dragStartEnd.current, deltaMinutes);
        const clampedEnd = clampToDay(
          new Date(
            Math.max(
              minEnd.getTime(),
              Math.min(dayEnd.getTime(), newEnd.getTime()),
            ),
          ),
        );
        onUpdate(id, { endTime: clampedEnd });
      }
    },
    [
      id,
      startTime,
      endTime,
      dayStart,
      dayEnd,
      hourHeight,
      clampToDay,
      onUpdate,
    ],
  );

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = null;
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
  }, [handlePointerMove]);

  const startDrag = useCallback(
    (e: React.PointerEvent, mode: "move" | "top" | "bottom") => {
      e.preventDefault();
      e.stopPropagation();
      isDraggingRef.current = mode;
      dragStartY.current = e.clientY;
      dragStartStart.current = startTime;
      dragStartEnd.current = endTime;
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [startTime, endTime, handlePointerMove, handlePointerUp],
  );

  return (
    <div
      className={cn(
        "absolute left-1.5 rounded-xl border shadow-sm overflow-hidden",
        "flex flex-col",
        isThin ? "pl-2 pr-3 py-1.5 min-h-0" : "pl-3 pr-4 py-2 gap-0.5",
        showResizeHandle ? "right-5" : "right-1.5",
        isActive &&
          "border-emerald-500/80 shadow-emerald-500/20 shadow-md",
      )}
      style={{
        top,
        height: displayHeight,
        borderLeftWidth: 4,
        borderLeftColor: color,
        borderColor: toRgba(color, 0.4),
        backgroundColor: toRgba(color, 0.65),
      }}
      title={
        isThin
          ? `${projectName} · ${startLabel} – ${endLabel}${description ? ` · ${description}` : ""}`
          : undefined
      }
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {/* Top resize handle - only when tall enough */}
      {displayHeight > 40 && (
        <div
          className="absolute left-0 right-0 top-0 h-2 cursor-n-resize flex items-center justify-center group"
          onPointerDown={(e) => startDrag(e, "top")}
          aria-label="Resize start time"
        >
          <div className="w-8 h-0.5 rounded-full bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}

      {/* Body - draggable for move */}
      <div
        className={cn(
          "flex-1 flex items-center cursor-grab active:cursor-grabbing min-h-0",
          isThin ? "flex-row" : "flex-col items-start",
        )}
        onPointerDown={(e) => startDrag(e, "move")}
      >
        {isThin ? (
          <span
            className="font-medium truncate text-xs leading-tight block"
            style={{ minWidth: 0 }}
          >
            {projectName}
          </span>
        ) : (
          <>
            <span
              className="font-medium truncate block"
              title={projectName}
            >
              {projectName}
            </span>
            <span className="text-[11px] text-muted-foreground block mt-0.5 leading-tight">
              {startLabel} – {endLabel}
            </span>
            {description && (
              <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-tight">
                {description}
              </p>
            )}
          </>
        )}
      </div>

      {/* Bottom resize handle */}
      {displayHeight > 40 && (
        <div
          className="absolute left-0 right-0 bottom-0 h-2 cursor-n-resize flex items-end justify-center group"
          onPointerDown={(e) => startDrag(e, "bottom")}
          aria-label="Resize end time"
        >
          <div className="w-8 h-0.5 rounded-full bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}
    </div>
  );
}
