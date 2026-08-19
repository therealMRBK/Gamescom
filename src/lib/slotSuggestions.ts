import { EVENT_DAYS, BUFFER_MINUTES } from "@/lib/constants";
import { hallDistance, normalizeHallId } from "@/lib/hallMap";

const DAY_START_MINUTES = 9 * 60;
const DAY_END_MINUTES = 20 * 60;
const SLOT_STEP_MINUTES = 15;
const MIN_SUGGESTION_GAP_MINUTES = 60;

export type ExistingAppointment = {
  day: string;
  startMinutes: number;
  endMinutes: number;
  hall: string | null;
};

export type SlotSuggestion = {
  day: string;
  startMinutes: number;
  endMinutes: number;
  score: number;
  reason: string;
};

/**
 * Schlägt freie Termin-Slots vor: bevorzugt Zeiten direkt vor/nach einem
 * bestehenden Termin in derselben oder einer (laut Hallen-Schema)
 * benachbarten Halle, respektiert dieselbe Konflikt-/Pufferlogik wie
 * src/lib/scheduling.ts (BUFFER_MINUTES zwischen unterschiedlichen Hallen).
 */
export function suggestSlots(input: {
  existing: ExistingAppointment[];
  targetHall: string | null;
  durationMinutes: number;
  preferredDays?: string[];
  limit?: number;
}): SlotSuggestion[] {
  const days =
    input.preferredDays && input.preferredDays.length > 0
      ? input.preferredDays
      : EVENT_DAYS.map((d) => d.date);

  const targetHallId = normalizeHallId(input.targetHall);
  const suggestions: SlotSuggestion[] = [];

  for (const day of days) {
    const dayAppointments = input.existing
      .filter((a) => a.day === day)
      .sort((a, b) => a.startMinutes - b.startMinutes);

    for (
      let start = DAY_START_MINUTES;
      start + input.durationMinutes <= DAY_END_MINUTES;
      start += SLOT_STEP_MINUTES
    ) {
      const end = start + input.durationMinutes;

      let blocked = false;
      let neighborBefore: ExistingAppointment | null = null;
      let neighborAfter: ExistingAppointment | null = null;

      for (const appt of dayAppointments) {
        const overlap = start < appt.endMinutes && appt.startMinutes < end;
        if (overlap) {
          blocked = true;
          break;
        }

        const apptHallId = normalizeHallId(appt.hall);
        const sameHall = targetHallId && apptHallId && apptHallId === targetHallId;

        if (appt.endMinutes <= start) {
          const gap = start - appt.endMinutes;
          if (!sameHall && gap < BUFFER_MINUTES) {
            blocked = true;
            break;
          }
          if (!neighborBefore || appt.endMinutes > neighborBefore.endMinutes) {
            neighborBefore = appt;
          }
        }
        if (appt.startMinutes >= end) {
          const gap = appt.startMinutes - end;
          if (!sameHall && gap < BUFFER_MINUTES) {
            blocked = true;
            break;
          }
          if (!neighborAfter || appt.startMinutes < neighborAfter.startMinutes) {
            neighborAfter = appt;
          }
        }
      }
      if (blocked) continue;

      let score = 0;
      const reasons: string[] = [];

      if (neighborBefore) {
        const dist = targetHallId ? hallDistance(normalizeHallId(neighborBefore.hall), targetHallId) : null;
        if (dist === 0) {
          score += 30;
          reasons.push("direkt nach Termin in derselben Halle");
        } else if (dist !== null) {
          score += Math.max(0, 20 - dist * 5);
          reasons.push(`nahe am vorigen Termin (${dist} Halle${dist === 1 ? "" : "n"} entfernt)`);
        }
      }
      if (neighborAfter) {
        const dist = targetHallId ? hallDistance(targetHallId, normalizeHallId(neighborAfter.hall)) : null;
        if (dist === 0) score += 15;
        else if (dist !== null) score += Math.max(0, 10 - dist * 3);
      }
      if (!neighborBefore && !neighborAfter) {
        reasons.push("freier Slot ohne direkt angrenzende Termine");
      }

      suggestions.push({
        day,
        startMinutes: start,
        endMinutes: end,
        score,
        reason: reasons.join(", ") || "freier Slot",
      });
    }
  }

  suggestions.sort((a, b) => b.score - a.score);

  const picked: SlotSuggestion[] = [];
  for (const s of suggestions) {
    const tooClose = picked.some(
      (p) => p.day === s.day && Math.abs(p.startMinutes - s.startMinutes) < MIN_SUGGESTION_GAP_MINUTES,
    );
    if (tooClose) continue;
    picked.push(s);
    if (picked.length >= (input.limit ?? 5)) break;
  }
  return picked;
}
