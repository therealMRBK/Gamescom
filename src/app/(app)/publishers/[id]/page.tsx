import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PublisherForm } from "@/components/PublisherForm";
import { DeleteButton } from "@/components/DeleteButton";
import { deletePublisherEntry } from "@/lib/actions/publishers";
import {
  CONTACT_STATUS_LABELS,
  CONTACT_STATUS_COLORS,
} from "@/lib/constants";
import { formatWallDateLabel, formatWallTime } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function PublisherDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [entry, teamMembers] = await Promise.all([
    prisma.publisherEntry.findUnique({
      where: { id },
      include: {
        statusHistory: { orderBy: { changedAt: "desc" }, include: { changedBy: true } },
        appointments: { orderBy: { startTime: "asc" } },
        assignedUser: true,
      },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!entry) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/publishers" className="text-sm text-slate-400">
          ← Zurück
        </Link>
        <DeleteButton
          action={deletePublisherEntry.bind(null, entry.id)}
          confirmText={`"${entry.publisher}" wirklich löschen? Dies entfernt auch die Statushistorie.`}
          redirectTo="/publishers"
        />
      </div>

      <h1 className="text-lg font-bold text-white">{entry.publisher}</h1>

      <section className="rounded-xl bg-slate-900 p-4 ring-1 ring-slate-800">
        <h2 className="mb-3 text-sm font-semibold text-slate-300">Bearbeiten</h2>
        <PublisherForm
          entryId={entry.id}
          initial={{
            publisher: entry.publisher,
            games: entry.games,
            hall: entry.hall || undefined,
            priority: entry.priority,
            category: entry.category,
            contactChannel: entry.contactChannel,
            contactPersonName: entry.contactPersonName || undefined,
            contactPersonEmail: entry.contactPersonEmail || undefined,
            assignedUserId: entry.assignedUserId,
            notes: entry.notes || undefined,
          }}
          teamMembers={teamMembers}
        />
      </section>

      {entry.appointments.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-300">Termine</h2>
          <ul className="space-y-2">
            {entry.appointments.map((appt) => (
              <li
                key={appt.id}
                className="rounded-xl bg-slate-900 p-3 text-sm ring-1 ring-slate-800"
              >
                {formatWallDateLabel(appt.startTime)} · {formatWallTime(appt.startTime)}–
                {formatWallTime(appt.endTime)} · {appt.title}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-300">Änderungshistorie</h2>
        <ul className="space-y-2">
          {entry.statusHistory.map((h) => (
            <li
              key={h.id}
              className="flex items-center justify-between rounded-xl bg-slate-900 p-3 text-xs ring-1 ring-slate-800"
            >
              <span className={`rounded-full px-2 py-0.5 font-medium ${CONTACT_STATUS_COLORS[h.newStatus]}`}>
                {CONTACT_STATUS_LABELS[h.newStatus]}
              </span>
              <span className="text-slate-500">
                {new Date(h.changedAt).toLocaleString("de-DE")}
                {h.changedBy ? ` · ${h.changedBy.name}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
