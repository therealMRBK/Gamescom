"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/rbac";
import {
  generateContentDraft,
  generateDailyBriefing,
  generateOutreachEmail,
  suggestPublisherPriority,
} from "@/lib/ai";
import { berlinTodayKey, formatWallTime } from "@/lib/dates";
import { EVENT_DAYS } from "@/lib/constants";
import { findConflicts } from "@/lib/scheduling";

export async function generateContentDraftForAppointment(appointmentId: string) {
  await requireSession();

  const appointment = await prisma.appointment.findUniqueOrThrow({
    where: { id: appointmentId },
    include: { publisherEntry: true, contentPiece: true },
  });

  return generateContentDraft({
    publisher: appointment.publisherEntry?.publisher || "Unbekannter Publisher",
    games: appointment.publisherEntry?.games || [],
    format: appointment.contentPiece?.format || "HANDS_ON",
    appointmentTitle: appointment.title,
    hall: appointment.hall,
    notes: appointment.notes,
  });
}

export async function generateOutreachEmailForPublisher(publisherEntryId: string) {
  await requireSession();

  const entry = await prisma.publisherEntry.findUniqueOrThrow({
    where: { id: publisherEntryId },
  });

  return generateOutreachEmail({
    publisher: entry.publisher,
    games: entry.games,
    contactPersonName: entry.contactPersonName,
    contactChannel: entry.contactChannel,
  });
}

export async function generateDashboardBriefing() {
  await requireSession();

  const todayKey = berlinTodayKey();
  const isEventDay = EVENT_DAYS.some((d) => d.date === todayKey);
  const targetDayKey = isEventDay ? todayKey : EVENT_DAYS[0].date;
  const dayLabel = EVENT_DAYS.find((d) => d.date === targetDayKey)!.label;
  const targetDayStart = new Date(`${targetDayKey}T00:00:00.000Z`);
  const targetDayEnd = new Date(`${targetDayKey}T23:59:59.999Z`);

  const [todaysAppointments, priorityWithoutAppointment, allAppointments] = await Promise.all([
    prisma.appointment.findMany({
      where: { startTime: { gte: targetDayStart, lte: targetDayEnd } },
      orderBy: { startTime: "asc" },
      include: { publisherEntry: true, assignments: true },
    }),
    prisma.publisherEntry.findMany({
      where: {
        priority: "HOCH",
        contactStatus: { notIn: ["BESTAETIGT", "ABGELEHNT"] },
        appointments: { none: {} },
      },
      select: { publisher: true },
    }),
    prisma.appointment.findMany({
      where: { startTime: { gte: targetDayStart, lte: targetDayEnd } },
      include: { assignments: true },
    }),
  ]);

  const conflicts = findConflicts(
    allAppointments.map((a) => ({
      id: a.id,
      startTime: a.startTime,
      endTime: a.endTime,
      hall: null,
      assignments: a.assignments,
    })),
  );

  return generateDailyBriefing({
    dayLabel,
    appointments: todaysAppointments.map((a) => ({
      time: formatWallTime(a.startTime),
      title: a.title,
      publisher: a.publisherEntry?.publisher,
    })),
    priorityPublishersWithoutAppointment: priorityWithoutAppointment.map((p) => p.publisher),
    conflictCount: conflicts.length,
  });
}

export async function suggestPriorityForNewPublisher(publisher: string, gamesText: string) {
  await requireSession();

  const games = gamesText
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);

  return suggestPublisherPriority({ publisher, games });
}
