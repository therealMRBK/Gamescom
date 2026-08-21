import { prisma } from "@/lib/prisma";
import { berlinTodayKey, formatWallDateLabel, formatWallTime } from "@/lib/dates";
import { EVENT_DAYS } from "@/lib/constants";
import { DailyBriefing } from "@/components/DailyBriefing";
import { StatDial } from "@/components/StatDial";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const todayKey = berlinTodayKey();
  const isEventDay = EVENT_DAYS.some((d) => d.date === todayKey);
  const targetDayKey = isEventDay ? todayKey : EVENT_DAYS[0].date;
  const targetDayStart = new Date(`${targetDayKey}T00:00:00.000Z`);
  const targetDayEnd = new Date(`${targetDayKey}T23:59:59.999Z`);

  const [todaysAppointments, statusCounts] = await Promise.all([
    prisma.appointment.findMany({
      where: { startTime: { gte: targetDayStart, lte: targetDayEnd } },
      orderBy: { startTime: "asc" },
      include: {
        publisherEntry: true,
        assignments: { include: { user: true } },
      },
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
        <p className="text-sm text-stone-400">
          {EVENT_DAYS.find((d) => d.date === targetDayKey)?.phase}
        </p>
      </div>

      <section className="grid grid-cols-3 gap-3">
        <StatDial value={openCount} total={totalEntries} label="Offen" color="accent" />
        <StatDial value={confirmedCount} total={totalEntries} label="Bestätigt" color="good" />
        <StatDial value={rejectedCount} total={totalEntries} label="Abgelehnt" color="bad" />
      </section>

      <DailyBriefing />

      <section>
        <h2 className="mb-2 text-sm font-semibold text-stone-300">
          Termine {formatWallDateLabel(targetDayStart)}
        </h2>
        {todaysAppointments.length === 0 ? (
          <p className="rounded-xl bg-stone-900 p-4 text-sm text-stone-500 ring-1 ring-stone-800">
            Keine Termine an diesem Tag.
          </p>
        ) : (
          <ul className="space-y-2">
            {todaysAppointments.map((appt) => (
              <li
                key={appt.id}
                className="rounded-xl bg-stone-900 p-3 ring-1 ring-stone-800"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      <span className="font-console tabular-nums text-amber-500">
                        {formatWallTime(appt.startTime)}–{formatWallTime(appt.endTime)}
                      </span>{" "}
                      · {appt.title}
                    </p>
                    <p className="text-xs text-stone-400">
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
                        className="rounded-full bg-stone-800 px-2 py-0.5 text-[11px] text-stone-300"
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
    </div>
  );
}
