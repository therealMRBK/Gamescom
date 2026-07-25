import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CalendarBoard, type CalendarAppointment } from "@/components/CalendarBoard";
import { EVENT_DAYS } from "@/lib/constants";
import { findConflicts } from "@/lib/scheduling";
import { berlinTodayKey, wallDateKey } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; day?: string }>;
}) {
  const params = await searchParams;
  const view = params.view === "week" ? "week" : "day";
  const todayKey = berlinTodayKey();
  const isEventDay = EVENT_DAYS.some((d) => d.date === todayKey);
  const selectedDay =
    params.day && EVENT_DAYS.some((d) => d.date === params.day)
      ? params.day
      : isEventDay
        ? todayKey
        : EVENT_DAYS[0].date;

  const rangeStart = new Date(`${EVENT_DAYS[0].date}T00:00:00.000Z`);
  const rangeEnd = new Date(`${EVENT_DAYS[EVENT_DAYS.length - 1].date}T23:59:59.999Z`);

  const appointments = await prisma.appointment.findMany({
    where: { startTime: { gte: rangeStart, lte: rangeEnd } },
    orderBy: { startTime: "asc" },
    include: {
      publisherEntry: true,
      assignments: { include: { user: true } },
    },
  });

  const conflicts = findConflicts(
    appointments.map((a) => ({
      id: a.id,
      startTime: a.startTime,
      endTime: a.endTime,
      hall: a.hall,
      assignments: a.assignments,
    })),
  );

  const conflictByAppointment = new Map<
    string,
    { type: "overlap" | "buffer"; gapMinutes?: number }
  >();
  for (const c of conflicts) {
    const existing = conflictByAppointment.get(c.appointmentId);
    if (!existing || (existing.type === "buffer" && c.type === "overlap")) {
      conflictByAppointment.set(c.appointmentId, { type: c.type, gapMinutes: c.gapMinutes });
    }
    const existingOther = conflictByAppointment.get(c.otherId);
    if (!existingOther || (existingOther.type === "buffer" && c.type === "overlap")) {
      conflictByAppointment.set(c.otherId, { type: c.type, gapMinutes: c.gapMinutes });
    }
  }

  const daysToShow = view === "week" ? EVENT_DAYS : EVENT_DAYS.filter((d) => d.date === selectedDay);

  const days = daysToShow.map((d) => {
    const dayAppointments = appointments.filter((a) => wallDateKey(a.startTime) === d.date);
    const vms: CalendarAppointment[] = dayAppointments.map((a) => {
      const conflict = conflictByAppointment.get(a.id);
      return {
        id: a.id,
        title: a.title,
        startMinutes: a.startTime.getUTCHours() * 60 + a.startTime.getUTCMinutes(),
        endMinutes: a.endTime.getUTCHours() * 60 + a.endTime.getUTCMinutes(),
        hall: a.hall,
        stand: a.stand,
        publisherName: a.publisherEntry?.publisher || null,
        assignees: a.assignments.map((asn) => ({
          id: asn.user.id,
          name: asn.user.name,
          color: asn.user.color,
        })),
        conflict: conflict?.type || null,
        conflictGapMinutes: conflict?.gapMinutes,
      };
    });
    return { date: d.date, label: `${d.label}`, appointments: vms };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">Terminplan</h1>
        <Link
          href={`/print/calendar?day=${selectedDay}`}
          className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-300"
        >
          🖨️ Drucken
        </Link>
      </div>

      <div className="flex overflow-hidden rounded-xl ring-1 ring-slate-700">
        <Link
          href={`/calendar?view=day&day=${selectedDay}`}
          className={`flex-1 py-2 text-center text-sm ${view === "day" ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-400"}`}
        >
          Tag
        </Link>
        <Link
          href="/calendar?view=week"
          className={`flex-1 py-2 text-center text-sm ${view === "week" ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-400"}`}
        >
          Woche
        </Link>
      </div>

      {view === "day" && (
        <div className="-mx-4 flex gap-1 overflow-x-auto px-4">
          {EVENT_DAYS.map((d) => (
            <Link
              key={d.date}
              href={`/calendar?view=day&day=${d.date}`}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs ${d.date === selectedDay ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-400"}`}
            >
              {d.label}
            </Link>
          ))}
        </div>
      )}

      {conflicts.length > 0 && (
        <p className="rounded-lg bg-amber-950 px-3 py-2 text-xs text-amber-300 ring-1 ring-amber-900">
          ⚠️ {conflicts.length} Konflikt(e)/Pufferzeit-Warnung(en) im gesamten Zeitraum.
        </p>
      )}

      <CalendarBoard days={days} />
    </div>
  );
}
