import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { EVENT_DAYS } from "@/lib/constants";
import { formatWallTime, wallDateKey } from "@/lib/dates";
import { findConflicts } from "@/lib/scheduling";
import { PrintButton } from "@/components/PrintButton";

export default async function PrintCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const { day } = await searchParams;
  const selectedDay = day && EVENT_DAYS.some((d) => d.date === day) ? day : EVENT_DAYS[0].date;
  const dayMeta = EVENT_DAYS.find((d) => d.date === selectedDay)!;

  const rangeStart = new Date(`${EVENT_DAYS[0].date}T00:00:00.000Z`);
  const rangeEnd = new Date(`${EVENT_DAYS[EVENT_DAYS.length - 1].date}T23:59:59.999Z`);

  const allAppointments = await prisma.appointment.findMany({
    where: { startTime: { gte: rangeStart, lte: rangeEnd } },
    orderBy: { startTime: "asc" },
    include: { publisherEntry: true, assignments: { include: { user: true } } },
  });

  const conflicts = findConflicts(
    allAppointments.map((a) => ({
      id: a.id,
      startTime: a.startTime,
      endTime: a.endTime,
      hall: a.hall,
      assignments: a.assignments,
    })),
  );
  const conflictIds = new Set(conflicts.flatMap((c) => [c.appointmentId, c.otherId]));

  const appointments = allAppointments.filter((a) => wallDateKey(a.startTime) === selectedDay);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link href="/calendar" className="text-sm text-slate-600">
          ← Zurück zum Kalender
        </Link>
        <PrintButton />
      </div>

      <div className="no-print mb-4 flex flex-wrap gap-1">
        {EVENT_DAYS.map((d) => (
          <Link
            key={d.date}
            href={`/print/calendar?day=${d.date}`}
            className={`rounded-lg px-3 py-1.5 text-xs ${d.date === selectedDay ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700"}`}
          >
            {d.label}
          </Link>
        ))}
      </div>

      <h1 className="text-xl font-bold">Terminplan – {dayMeta.label}</h1>
      <p className="mb-4 text-sm text-slate-600">{dayMeta.phase} · Spieletester.de · gamescom 2026</p>

      {appointments.length === 0 ? (
        <p className="text-sm text-slate-500">Keine Termine an diesem Tag.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-left">
              <th className="py-2 pr-2">Zeit</th>
              <th className="py-2 pr-2">Termin</th>
              <th className="py-2 pr-2">Ort</th>
              <th className="py-2 pr-2">Team</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((appt) => (
              <tr key={appt.id} className="border-b border-slate-200 align-top">
                <td className="py-2 pr-2 whitespace-nowrap font-medium">
                  {formatWallTime(appt.startTime)}–{formatWallTime(appt.endTime)}
                  {conflictIds.has(appt.id) && (
                    <span className="ml-1 text-red-600">⚠</span>
                  )}
                </td>
                <td className="py-2 pr-2">
                  <p className="font-medium">{appt.title}</p>
                  {appt.publisherEntry && (
                    <p className="text-xs text-slate-500">{appt.publisherEntry.publisher}</p>
                  )}
                </td>
                <td className="py-2 pr-2">
                  {appt.hall ? `Halle ${appt.hall}` : ""}
                  {appt.stand ? ` / Stand ${appt.stand}` : ""}
                </td>
                <td className="py-2 pr-2">
                  {appt.assignments.map((a) => a.user.name).join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
