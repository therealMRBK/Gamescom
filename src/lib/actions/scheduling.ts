"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/rbac";
import { toActionResult, type ActionResult } from "@/lib/actionResult";
import { suggestSlots, type ExistingAppointment } from "@/lib/slotSuggestions";
import { EVENT_DAYS } from "@/lib/constants";

export type SlotSuggestionResult = {
  day: string;
  dayLabel: string;
  startTime: string;
  endTime: string;
  reason: string;
};

export async function suggestAppointmentSlots(input: {
  publisherEntryId?: string | null;
  durationMinutes?: number;
  preferredDay?: string;
}): Promise<ActionResult<SlotSuggestionResult[]>> {
  await requireSession();

  return toActionResult(async () => {
    const [appointments, publisher] = await Promise.all([
      prisma.appointment.findMany({ select: { startTime: true, endTime: true, hall: true } }),
      input.publisherEntryId
        ? prisma.publisherEntry.findUnique({
            where: { id: input.publisherEntryId },
            select: { hall: true },
          })
        : Promise.resolve(null),
    ]);

    const existing: ExistingAppointment[] = appointments.map((a) => ({
      day: a.startTime.toISOString().slice(0, 10),
      startMinutes: a.startTime.getUTCHours() * 60 + a.startTime.getUTCMinutes(),
      endMinutes: a.endTime.getUTCHours() * 60 + a.endTime.getUTCMinutes(),
      hall: a.hall,
    }));

    const suggestions = suggestSlots({
      existing,
      targetHall: publisher?.hall || null,
      durationMinutes: input.durationMinutes || 30,
      preferredDays: input.preferredDay ? [input.preferredDay] : undefined,
      limit: 5,
    });

    return suggestions.map((s) => ({
      day: s.day,
      dayLabel: EVENT_DAYS.find((d) => d.date === s.day)?.label || s.day,
      startTime: minutesToHHMM(s.startMinutes),
      endTime: minutesToHHMM(s.endMinutes),
      reason: s.reason,
    }));
  });
}

function minutesToHHMM(minutes: number): string {
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}
