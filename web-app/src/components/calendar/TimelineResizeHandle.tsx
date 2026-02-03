"use client";

interface TimelineResizeHandleProps {
  onResizeStart: (e: React.PointerEvent<HTMLDivElement>) => void;
}

export function TimelineResizeHandle({ onResizeStart }: TimelineResizeHandleProps) {
  return (
    <div
      className="absolute top-0 right-0 bottom-0 w-4 flex items-center justify-center cursor-ns-resize"
      onPointerDown={onResizeStart}
    >
      <div className="h-16 w-1 rounded-full bg-border/80" />
    </div>
  );
}
