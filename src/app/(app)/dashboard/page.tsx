import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { berlinTodayKey, formatWallDateLabel, formatWallTime } from "@/lib/dates";
import { EVENT_DAYS, PRIORITY_COLORS, PRIORITY_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const todayKey = berlinTodayKey();
  const isEventDay = EVENT_DAYS.some((d) => d.date === todayKey);
  const targetDayKey = isEventDay ? todayKey : EVENT_DAYS[0].date;
  const targetDayStart = new Date(`${targetDayKey}T00:00:00.000Z`);
  const targetDayEnd = new Date(`${targetDayKey}T23:59:59.999Z`);

  const [todaysAppointments, priorityWithoutAppointment, statusCounts] =
    await Promise.all([
      prisma.appointment.findMany({
        where: { startTime: { gte: targetDayStart, lte: targetDayEnd } },
        orderBy: { startTime: "asc" },
        include: {
          publisherEntry: true,
          assignments: { include: { user: true } },
        },
      }),
      prisma.publisherEntry.findMany({
        where: {
          priority: "HOCH",
          contactStatus: { notIn: ["BESTAETIGT", "ABGELEHNT"] },
          appointments: { none: {} },
        },
        orderBy: { publisher: "asc" },
      }),
      prisma.publisherEntry.groupBy({
        by: ["contactStatus"],
        _count: true,
      }),
    ]);

  const countFor = (status: string) =>
    statusCounts.find((s) => s.contactStatus === status)?._count ?? 0;
  const totalEntries = statusCounts.reduce((sum, s) => sum + s._count, 0);
  const confirmedCount = countFor("BESTAETIGT");
  const rejectedCount = countFor("ABGELEHNT");
  const openCount = totalEntries - confirmedCount - rejectedCount;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-white">
          {isEventDay ? "Heute" : "Nächster Messetag"} · {formatWallDateLabel(targetDayStart)}
        </h1>
        <p className="text-sm text-slate-400">
          {EVENT_DAYS.find((d) => d.date === targetDayKey)?.phase}
        </p>
      </div>

      <section className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-slate-900 p-3 ring-1 ring-slate-800">
          <p className="text-2xl font-bold text-blue-300">{openCount}</p>
          <p className="text-xs text-slate-400">Offene Anfragen</p>
        </div>
        <div className="rounded-xl bg-slate-900 p-3 ring-1 ring-slate-800">
          <p className="text-2xl font-bold text-emerald-300">{confirmedCount}</p>
          <p className="text-xs text-slate-400">Bestätigt</p>
        </div>
        <div className="rounded-xl bg-slate-900 p-3 ring-1 ring-slate-800">
          <p className="text-2xl font-bold text-red-300">{rejectedCount}</p>
          <p className="text-xs text-slate-400">Abgelehnt</p>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-300">
          Termine {formatWallDateLabel(targetDayStart)}
        </h2>
        {todaysAppointments.length === 0 ? (
          <p className="rounded-xl bg-slate-900 p-4 text-sm text-slate-500 ring-1 ring-slate-800">
            Keine Termine an diesem Tag.
          </p>
        ) : (
          <ul className="space-y-2">
            {todaysAppointments.map((appt) => (
              <li
                key={appt.id}
                className="rounded-xl bg-slate-900 p-3 ring-1 ring-slate-800"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {formatWallTime(appt.startTime)}–{formatWallTime(appt.endTime)} · {appt.title}
                    </p>
                    <p className="text-xs text-slate-400">
                      {appt.publisherEntry?.publisher}
                      {appt.hall ? ` · Halle ${appt.hall}` : ""}
                      {appt.stand ? ` / Stand ${appt.stand}` : ""}
                    </p>
                  </div>
                </div>
                {appt.assignments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {appt.assignments.map((a) => (
                      <span
                        key={a.id}
                        className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300"
                      >
                        {a.user.name}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300">
            Prioritäts-Publisher ohne Termin
          </h2>
          <Link href="/publishers" className="text-xs text-indigo-400">
            Alle ansehen
          </Link>
        </div>
        {priorityWithoutAppointment.length === 0 ? (
          <p className="rounded-xl bg-slate-900 p-4 text-sm text-slate-500 ring-1 ring-slate-800">
            Alle High-Priority-Publisher haben einen Termin oder sind erledigt. 🎉
          </p>
        ) : (
          <ul className="space-y-2">
            {priorityWithoutAppointment.map((entry) => (
              <li key={entry.id}>
                <Link
                  href={`/publishers/${entry.id}`}
                  className="flex items-center justify-between rounded-xl bg-slate-900 p-3 ring-1 ring-slate-800 active:bg-slate-800"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {entry.publisher}
                    </p>
                    <p className="text-xs text-slate-400">
                      {entry.games.slice(0, 2).join(", ")}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-medium ${PRIORITY_COLORS[entry.priority]}`}
                  >
                    {PRIORITY_LABELS[entry.priority]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
