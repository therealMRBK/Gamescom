"use client";

import { useState, useTransition } from "react";
import { generateDashboardBriefing } from "@/lib/actions/ai";

export function DailyBriefing() {
  const [isPending, startTransition] = useTransition();
  const [briefing, setBriefing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="rounded-xl bg-stone-900 p-4 ring-1 ring-stone-800">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-stone-300">KI-Briefing</h2>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await generateDashboardBriefing();
              if (result.ok) {
                setBriefing(result.value);
              } else {
                setError(result.error);
              }
            });
          }}
          className="rounded-lg bg-stone-800 px-2 py-1 text-xs text-amber-400 disabled:opacity-50"
        >
          {isPending ? "Generiert…" : "✨ Briefing generieren"}
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {briefing && <p className="text-sm leading-relaxed text-stone-200">{briefing}</p>}
      {!briefing && !error && (
        <p className="text-xs text-stone-500">
          Fasst Termine, offene Prioritäten und Konflikte des Tages in wenigen Sätzen zusammen.
        </p>
      )}
    </section>
  );
}
