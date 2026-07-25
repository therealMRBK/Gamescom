import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/rbac";
import { AvailabilityEditor } from "@/components/AvailabilityEditor";
import { FOCUS_AREA_LABELS } from "@/lib/constants";
import { formatWallDateLabel, formatWallTime, isUpcoming, wallDateKey } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function TeamMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();

  const member = await prisma.user.findUnique({
    where: { id },
    include: {
      availabilities: true,
      appointmentAssignments: {
        include: { appointment: { include: { publisherEntry: true } } },
        orderBy: { appointment: { startTime: "asc" } },
      },
    },
  });

  if (!member) notFound();

  const canEditAvailability = session.user.role === "ADMIN" || session.user.id === member.id;

  const availabilityMap = Object.fromEntries(
    member.availabilities.map((a) => [
      wallDateKey(a.day),
      {
        onSite: a.onSite,
        timeFrom: a.timeFrom || "",
        timeTo: a.timeTo || "",
      },
    ]),
  );

  const upcoming = member.appointmentAssignments
    .filter((a) => isUpcoming(a.appointment.endTime))
    .map((a) => a.appointment);

  const byDay = new Map<string, typeof upcoming>();
  for (const appt of upcoming) {
    const key = wallDateKey(appt.startTime);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(appt);
  }

  return (
    <div className="space-y-6">
      <Link href="/team" className="text-sm text-slate-400">
        ← Zurück
      </Link>

      <div className="flex items-center gap-3">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full text-base font-semibold text-white"
          style={{ backgroundColor: member.color }}
        >
          {member.name.slice(0, 2).toUpperCase()}
        </span>
        <div>
          <h1 className="text-lg font-bold text-white">{member.name}</h1>
          <p className="text-sm text-slate-400">
            {member.role === "ADMIN" ? "Admin" : "Redakteur:in"}
            {member.focusArea ? ` · ${FOCUS_AREA_LABELS[member.focusArea]}` : ""}
          </p>
        </div>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-300">
          Persönliche Tagesansicht – kommende Termine
        </h2>
        {byDay.size === 0 ? (
          <p className="rounded-xl bg-slate-900 p-4 text-sm text-slate-500 ring-1 ring-slate-800">
            Keine anstehenden Termine zugewiesen.
          </p>
        ) : (
          <div className="space-y-3">
            {[...byDay.entries()].map(([day, appts]) => (
              <div key={day}>
                <p className="mb-1 text-xs font-semibold text-slate-500">
                  {formatWallDateLabel(appts[0].startTime)}
                </p>
                <ul className="space-y-2">
                  {appts.map((appt) => (
                    <li
                      key={appt.id}
                      className="rounded-xl bg-slate-900 p-3 text-sm ring-1 ring-slate-800"
                    >
                      <p className="font-semibold text-white">
                        {formatWallTime(appt.startTime)}–{formatWallTime(appt.endTime)} ·{" "}
                        {appt.title}
                      </p>
                      <p className="text-xs text-slate-400">
                        {appt.publisherEntry?.publisher}
                        {appt.hall ? ` · Halle ${appt.hall}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-300">
          Verfügbarkeit pro Messetag
        </h2>
        {canEditAvailability ? (
          <AvailabilityEditor userId={member.id} initial={availabilityMap} />
        ) : (
          <p className="rounded-xl bg-slate-900 p-4 text-sm text-slate-500 ring-1 ring-slate-800">
            Nur {member.name} oder Admin können die Verfügbarkeit bearbeiten.
          </p>
        )}
      </section>
    </div>
  );
}
