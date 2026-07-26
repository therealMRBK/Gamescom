import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  CONTENT_FORMAT_LABELS,
  CONTENT_STATUS_COLORS,
  CONTENT_STATUS_LABELS,
  CONTENT_STATUS_ORDER,
} from "@/lib/constants";
import { formatWallDateLabel, formatWallTime } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function ContentPage() {
  const appointments = await prisma.appointment.findMany({
    orderBy: { startTime: "asc" },
    include: { publisherEntry: true, contentPiece: true },
  });

  const withoutContent = appointments.filter((a) => !a.contentPiece);
  const withContentByStatus = CONTENT_STATUS_ORDER.map((status) => ({
    status,
    items: appointments.filter((a) => a.contentPiece?.status === status),
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold text-white">Content-Pipeline</h1>

      {withoutContent.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-stone-400">
            Noch nicht geplant ({withoutContent.length})
          </h2>
          <ul className="space-y-2">
            {withoutContent.map((appt) => (
              <li key={appt.id}>
                <Link
                  href={`/calendar/${appt.id}/edit`}
                  className="block rounded-xl bg-stone-900 p-3 ring-1 ring-stone-800 active:bg-stone-800"
                >
                  <p className="text-sm font-semibold text-white">{appt.title}</p>
                  <p className="text-xs text-stone-400">
                    {formatWallDateLabel(appt.startTime)} · {formatWallTime(appt.startTime)} ·{" "}
                    {appt.publisherEntry?.publisher}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {withContentByStatus.map(({ status, items }) => (
        <section key={status}>
          <h2 className="mb-2 text-sm font-semibold text-stone-400">
            {CONTENT_STATUS_LABELS[status]} ({items.length})
          </h2>
          {items.length === 0 ? (
            <p className="text-xs text-stone-600">–</p>
          ) : (
            <ul className="space-y-2">
              {items.map((appt) => {
                const piece = appt.contentPiece!;
                const embargoIssue =
                  piece.embargoAt &&
                  piece.publishedAt &&
                  piece.publishedAt.getTime() < piece.embargoAt.getTime();
                return (
                  <li key={appt.id}>
                    <Link
                      href={`/calendar/${appt.id}/edit`}
                      className="block rounded-xl bg-stone-900 p-3 ring-1 ring-stone-800 active:bg-stone-800"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            {appt.title}
                          </p>
                          <p className="truncate text-xs text-stone-400">
                            {appt.publisherEntry?.publisher} ·{" "}
                            {CONTENT_FORMAT_LABELS[piece.format]}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ${CONTENT_STATUS_COLORS[piece.status]}`}
                        >
                          {CONTENT_STATUS_LABELS[piece.status]}
                        </span>
                      </div>
                      {piece.embargoAt && (
                        <p className="mt-1 text-xs text-stone-500">
                          Embargo: {new Date(piece.embargoAt).toLocaleString("de-DE")}
                        </p>
                      )}
                      {embargoIssue && (
                        <p className="mt-1 text-xs font-semibold text-red-400">
                          ⚠️ Veröffentlicht vor Embargo!
                        </p>
                      )}
                      {piece.link && (
                        <p className="mt-1 truncate text-xs text-amber-500">{piece.link}</p>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
