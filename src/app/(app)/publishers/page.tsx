import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PublisherFilterBar } from "@/components/PublisherFilterBar";
import { StatusSelect } from "@/components/StatusSelect";
import {
  CATEGORY_LABELS,
  CONTACT_STATUS_LABELS,
  CONTACT_STATUS_ORDER,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
} from "@/lib/constants";
import type { ContactChannel, ContactStatus, Priority, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const PRIORITY_SORT_WEIGHT: Record<string, number> = {
  HOCH: 0,
  MITTEL: 1,
  NIEDRIG: 2,
};

const STATUS_SORT_WEIGHT: Record<string, number> = Object.fromEntries(
  CONTACT_STATUS_ORDER.map((s, i) => [s, i]),
);

export default async function PublishersPage({
  searchParams,
}: {
  searchParams: Promise<{
    priority?: string;
    status?: string;
    channel?: string;
    sort?: string;
    view?: string;
  }>;
}) {
  const params = await searchParams;
  const view = params.view === "kanban" ? "kanban" : "list";

  const where: Prisma.PublisherEntryWhereInput = {
    ...(params.priority && { priority: params.priority as Priority }),
    ...(params.status && { contactStatus: params.status as ContactStatus }),
    ...(params.channel && { contactChannel: params.channel as ContactChannel }),
  };

  const entries = await prisma.publisherEntry.findMany({
    where,
    include: { assignedUser: true, appointments: true },
  });

  const sorted = [...entries].sort((a, b) => {
    if (params.sort === "status") {
      return STATUS_SORT_WEIGHT[a.contactStatus] - STATUS_SORT_WEIGHT[b.contactStatus];
    }
    if (params.sort === "publisher") {
      return a.publisher.localeCompare(b.publisher);
    }
    return PRIORITY_SORT_WEIGHT[a.priority] - PRIORITY_SORT_WEIGHT[b.priority];
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">Publisher &amp; Outreach</h1>
        <Link
          href="/publishers/new"
          className="rounded-lg bg-amber-700 px-3 py-2 text-sm font-medium text-white"
        >
          + Neu
        </Link>
      </div>

      <PublisherFilterBar />

      <p className="text-xs text-stone-500">{sorted.length} Einträge</p>

      {view === "list" ? (
        <ul className="space-y-2">
          {sorted.map((entry) => (
            <li key={entry.id}>
              <Link
                href={`/publishers/${entry.id}`}
                className="block rounded-xl bg-stone-900 p-3 ring-1 ring-stone-800 active:bg-stone-800"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {entry.publisher}
                    </p>
                    <p className="truncate text-xs text-stone-400">
                      {entry.games.slice(0, 2).join(", ")}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      {entry.hall ? `Halle ${entry.hall} · ` : ""}
                      {entry.category ? CATEGORY_LABELS[entry.category] : ""}
                      {entry.assignedUser ? ` · ${entry.assignedUser.name}` : ""}
                      {entry.appointments.length > 0 ? " · 📅 Termin" : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ${PRIORITY_COLORS[entry.priority]}`}
                  >
                    {PRIORITY_LABELS[entry.priority]}
                  </span>
                </div>
                <div className="mt-2">
                  <StatusSelect entryId={entry.id} status={entry.contactStatus} />
                </div>
              </Link>
            </li>
          ))}
          {sorted.length === 0 && (
            <p className="rounded-xl bg-stone-900 p-4 text-sm text-stone-500 ring-1 ring-stone-800">
              Keine Einträge für diesen Filter.
            </p>
          )}
        </ul>
      ) : (
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
          {CONTACT_STATUS_ORDER.map((status) => {
            const columnEntries = sorted.filter((e) => e.contactStatus === status);
            return (
              <div key={status} className="w-64 shrink-0">
                <p className="mb-2 text-xs font-semibold text-stone-400">
                  {CONTACT_STATUS_LABELS[status]} ({columnEntries.length})
                </p>
                <div className="space-y-2">
                  {columnEntries.map((entry) => (
                    <Link
                      key={entry.id}
                      href={`/publishers/${entry.id}`}
                      className="block rounded-xl bg-stone-900 p-3 ring-1 ring-stone-800 active:bg-stone-800"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-white">
                          {entry.publisher}
                        </p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${PRIORITY_COLORS[entry.priority]}`}
                        >
                          {PRIORITY_LABELS[entry.priority]}
                        </span>
                      </div>
                      <p className="truncate text-xs text-stone-500">
                        {entry.hall ? `Halle ${entry.hall}` : ""}
                        {entry.assignedUser ? ` · ${entry.assignedUser.name}` : ""}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
