export function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function currentUtcWeekKeys(now = new Date()): string[] {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - now.getUTCDay()),
  );

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + index);
    return utcDateKey(day);
  });
}
