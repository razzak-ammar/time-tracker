"use client";

interface NowIndicatorProps {
  top: number;
}

export function NowIndicator({ top }: NowIndicatorProps) {
  return (
    <div
      className="absolute left-0 right-0 h-px bg-emerald-500/80 z-10"
      style={{ top }}
    />
  );
}
