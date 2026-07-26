"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertContentPiece } from "@/lib/actions/content";
import { generateContentDraftForAppointment } from "@/lib/actions/ai";
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
  const [isGenerating, startGenerating] = useTransition();
  const [aiError, setAiError] = useState<string | null>(null);
  const [format, setFormat] = useState(initial?.format || "HANDS_ON");
  const [notes, setNotes] = useState(initial?.notes || "");
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
            format: format,
            status: formData.get("status") as ContentStatus,
            embargoAt: embargoAt ? dateTimeLocalToUtcWall(embargoAt).toISOString() : null,
            publishedAt: publishedAt
              ? dateTimeLocalToUtcWall(publishedAt).toISOString()
              : null,
            link: String(formData.get("link") || ""),
            notes,
          });
          router.refresh();
        });
      }}
    >
      <label className="block">
        <span className="mb-1 block text-sm text-stone-300">Format</span>
        <select
          name="format"
          value={format}
          onChange={(e) => setFormat(e.target.value as ContentFormat)}
          className="input"
        >
          {Object.entries(CONTENT_FORMAT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm text-stone-300">Status</span>
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
          <span className="mb-1 block text-sm text-stone-300">Embargo bis</span>
          <input
            type="datetime-local"
            value={embargoAt}
            onChange={(e) => setEmbargoAt(e.target.value)}
            className="input"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-stone-300">Veröffentlicht am</span>
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
        <span className="mb-1 block text-sm text-stone-300">Link zum Content</span>
        <input name="link" type="url" defaultValue={initial?.link || ""} className="input" />
      </label>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm text-stone-300">Notizen / Entwurf</span>
          <button
            type="button"
            disabled={isGenerating}
            onClick={() => {
              setAiError(null);
              startGenerating(async () => {
                try {
                  const draft = await generateContentDraftForAppointment(appointmentId);
                  setNotes(draft);
                } catch (e) {
                  setAiError(e instanceof Error ? e.message : "Fehler bei der KI-Generierung.");
                }
              });
            }}
            className="rounded-lg bg-stone-800 px-2 py-1 text-xs text-amber-400 disabled:opacity-50"
          >
            {isGenerating ? "Generiert…" : "✨ KI-Entwurf generieren"}
          </button>
        </div>
        <textarea
          name="notes"
          rows={5}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input"
        />
        {aiError && <p className="mt-1 text-xs text-red-400">{aiError}</p>}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-amber-700 px-4 py-3 text-base font-semibold text-white active:scale-[0.98] disabled:opacity-60"
      >
        {isPending ? "Speichert…" : "Content-Status speichern"}
      </button>
    </form>
  );
}
