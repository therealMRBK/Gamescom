/**
 * All appointment times are gamescom/Cologne wall-clock times, stored as UTC
 * instants with the same numbers (e.g. "10:00 Cologne" -> stored as
 * 2026-08-26T10:00:00Z). This avoids server-timezone ambiguity: always read
 * wall-clock parts back out with the UTC getters below, never local ones.
 */

export function dateTimeLocalToUtcWall(value: string): Date {
  const withSeconds = value.length === 16 ? `${value}:00` : value;
  return new Date(`${withSeconds}.000Z`);
}

export function utcWallToDateTimeLocal(date: Date): string {
  return date.toISOString().slice(0, 16);
}

export function formatWallTime(date: Date): string {
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function wallDateKey(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function berlinTodayKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

export function isUpcoming(date: Date): boolean {
  return date.getTime() >= Date.now();
}

export function formatWallDateLabel(date: Date): string {
  const weekday = WEEKDAYS[date.getUTCDay()];
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${weekday} ${dd}.${mm}.`;
}
