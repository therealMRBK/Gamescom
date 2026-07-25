"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertContentPiece } from "@/lib/actions/content";
import { CONTENT_FORMAT_LABELS, CONTENT_STATUS_LABELS } from "@/lib/constants";
import { utcWallToDateTimeLocal, dateTimeLocalToUtcWall } from "@/lib/dates";
import type { ContentFormat, ContentStatus } from "@prisma/client";

export function ContentFieldsForm({
  appointmentId,
  initial,
}: {
  appointmentId: string;
  initial?: {
    format: ContentFormat;
    status: ContentStatus;
    embargoAt: Date | null;
    publishedAt: Date | null;
    link: string | null;
    notes: string | null;
  };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [embargoAt, setEmbargoAt] = useState(
    initial?.embargoAt ? utcWallToDateTimeLocal(initial.embargoAt) : "",
  );
  const [publishedAt, setPublishedAt] = useState(
    initial?.publishedAt ? utcWallToDateTimeLocal(initial.publishedAt) : "",
  );

  const embargoWarning =
    embargoAt &&
    publishedAt &&
    dateTimeLocalToUtcWall(publishedAt) < dateTimeLocalToUtcWall(embargoAt);

  return (
    <form
      className="space-y-4"
      action={(formData: FormData) => {
        startTransition(async () => {
          await upsertContentPiece(appointmentId, {
            format: formData.get("format") as ContentFormat,
            status: formData.get("status") as ContentStatus,
            embargoAt: embargoAt ? dateTimeLocalToUtcWall(embargoAt).toISOString() : null,
            publishedAt: publishedAt
              ? dateTimeLocalToUtcWall(publishedAt).toISOString()
              : null,
            link: String(formData.get("link") || ""),
            notes: String(formData.get("notes") || ""),
          });
          router.refresh();
        });
      }}
    >
      <label className="block">
        <span className="mb-1 block text-sm text-slate-300">Format</span>
        <select name="format" defaultValue={initial?.format || "HANDS_ON"} className="input">
          {Object.entries(CONTENT_FORMAT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm text-slate-300">Status</span>
        <select name="status" defaultValue={initial?.status || "GEPLANT"} className="input">
          {Object.entries(CONTENT_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-sm text-slate-300">Embargo bis</span>
          <input
            type="datetime-local"
            value={embargoAt}
            onChange={(e) => setEmbargoAt(e.target.value)}
            className="input"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-slate-300">Veröffentlicht am</span>
          <input
            type="datetime-local"
            value={publishedAt}
            onChange={(e) => setPublishedAt(e.target.value)}
            className="input"
          />
        </label>
      </div>

      {embargoWarning && (
        <p className="rounded-lg bg-red-950 px-3 py-2 text-sm text-red-300 ring-1 ring-red-900">
          ⚠️ Veröffentlichungsdatum liegt vor dem Embargo!
        </p>
      )}

      <label className="block">
        <span className="mb-1 block text-sm text-slate-300">Link zum Content</span>
        <input name="link" type="url" defaultValue={initial?.link || ""} className="input" />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm text-slate-300">Notizen</span>
        <textarea name="notes" rows={2} defaultValue={initial?.notes || ""} className="input" />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-base font-semibold text-white active:scale-[0.98] disabled:opacity-60"
      >
        {isPending ? "Speichert…" : "Content-Status speichern"}
      </button>
    </form>
  );
}
