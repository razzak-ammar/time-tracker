/** Hour indices 0–23 for timeline grid */
export const HOURS = Array.from({ length: 24 }, (_, i) => i);

export const MIN_HOUR_HEIGHT = 30;
export const MAX_HOUR_HEIGHT = 120;

export const clamp = (value: number, minValue: number, maxValue: number) =>
  Math.min(maxValue, Math.max(minValue, value));

export function toRgba(hex: string, alpha: number): string {
  const normalized = hex.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(normalized)) {
    return hex;
  }

  const fullHex =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;

  const r = parseInt(fullHex.slice(0, 2), 16);
  const g = parseInt(fullHex.slice(2, 4), 16);
  const b = parseInt(fullHex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
