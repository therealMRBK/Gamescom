"use client";

import { useState, useTransition } from "react";
import { generateOutreachEmailForPublisher } from "@/lib/actions/ai";

export function OutreachEmailGenerator({ publisherEntryId }: { publisherEntryId: string }) {
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="rounded-xl bg-slate-900 p-4 ring-1 ring-slate-800">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-300">Outreach-E-Mail (KI)</h2>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              try {
                const text = await generateOutreachEmailForPublisher(publisherEntryId);
                setDraft(text);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Fehler bei der KI-Generierung.");
              }
            });
          }}
          className="rounded-lg bg-slate-800 px-2 py-1 text-xs text-indigo-300 disabled:opacity-50"
        >
          {isPending ? "Generiert…" : "✨ E-Mail-Entwurf generieren"}
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {draft && (
        <textarea
          readOnly
          value={draft}
          rows={10}
          className="input text-sm"
          onFocus={(e) => e.target.select()}
        />
      )}
      {!draft && !error && (
        <p className="text-xs text-slate-500">
          Erstellt einen Entwurf für eine Presseanfrage basierend auf Publisher, Spielen und
          Kontaktkanal.
        </p>
      )}
    </section>
  );
}
