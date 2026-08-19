"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createPublisherEntry,
  updatePublisherEntry,
  type PublisherEntryInput,
} from "@/lib/actions/publishers";
import { suggestPriorityForNewPublisher } from "@/lib/actions/ai";
import {
  CATEGORY_LABELS,
  CONTACT_CHANNEL_LABELS,
  PRIORITY_LABELS,
} from "@/lib/constants";
import type { Category, Priority } from "@prisma/client";

type TeamMember = { id: string; name: string };

export function PublisherForm({
  entryId,
  initial,
  teamMembers,
}: {
  entryId?: string;
  initial?: Partial<PublisherEntryInput>;
  teamMembers: TeamMember[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSuggesting, startSuggesting] = useTransition();
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);
  const [publisher, setPublisher] = useState(initial?.publisher || "");
  const [gamesText, setGamesText] = useState(
    (initial?.games || []).join(", "),
  );
  const [priority, setPriority] = useState<Priority>(initial?.priority || "MITTEL");
  const [category, setCategory] = useState<Category | "">(initial?.category || "");

  return (
    <form
      className="space-y-4"
      action={(formData: FormData) => {
        const input: PublisherEntryInput = {
          publisher,
          games: gamesText
            .split(",")
            .map((g) => g.trim())
            .filter(Boolean),
          hall: String(formData.get("hall") || ""),
          priority,
          category: category || null,
          contactChannel: formData.get(
            "contactChannel",
          ) as PublisherEntryInput["contactChannel"],
          contactPersonName: String(formData.get("contactPersonName") || ""),
          contactPersonEmail: String(formData.get("contactPersonEmail") || ""),
          assignedUserId: String(formData.get("assignedUserId") || "") || null,
          notes: String(formData.get("notes") || ""),
        };

        startTransition(async () => {
          if (entryId) {
            await updatePublisherEntry(entryId, input);
            router.refresh();
          } else {
            const created = await createPublisherEntry(input);
            router.push(`/publishers/${created.id}`);
          }
        });
      }}
    >
      <Field label="Publisher">
        <input
          name="publisher"
          required
          value={publisher}
          onChange={(e) => setPublisher(e.target.value)}
          className="input"
        />
      </Field>

      <Field label="Spiel(e) – Komma-getrennt">
        <textarea
          name="games"
          rows={2}
          value={gamesText}
          onChange={(e) => setGamesText(e.target.value)}
          className="input"
        />
      </Field>

      {!entryId && (
        <div>
          <button
            type="button"
            disabled={isSuggesting || !publisher.trim()}
            onClick={() => {
              setAiError(null);
              setAiReasoning(null);
              startSuggesting(async () => {
                const result = await suggestPriorityForNewPublisher(publisher, gamesText);
                if (result.ok) {
                  setPriority(result.value.priority);
                  setCategory(result.value.category);
                  setAiReasoning(result.value.reasoning);
                } else {
                  setAiError(result.error);
                }
              });
            }}
            className="rounded-lg bg-stone-800 px-2 py-1.5 text-xs text-amber-400 disabled:opacity-50"
          >
            {isSuggesting ? "Analysiert…" : "✨ KI-Vorschlag für Priorität/Kategorie"}
          </button>
          {aiReasoning && <p className="mt-1 text-xs text-stone-500">{aiReasoning}</p>}
          {aiError && <p className="mt-1 text-xs text-red-400">{aiError}</p>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Halle/Stand">
          <input name="hall" defaultValue={initial?.hall} className="input" />
        </Field>
        <Field label="Priorität">
          <select
            name="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className="input"
          >
            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Kategorie">
          <select
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category | "")}
            className="input"
          >
            <option value="">–</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Kontaktkanal">
          <select
            name="contactChannel"
            defaultValue={initial?.contactChannel || "SONSTIGE"}
            className="input"
          >
            {Object.entries(CONTACT_CHANNEL_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Ansprechpartner Name">
          <input
            name="contactPersonName"
            defaultValue={initial?.contactPersonName}
            className="input"
          />
        </Field>
        <Field label="Ansprechpartner E-Mail">
          <input
            type="email"
            name="contactPersonEmail"
            defaultValue={initial?.contactPersonEmail}
            className="input"
          />
        </Field>
      </div>

      <Field label="Zugewiesenes Teammitglied">
        <select
          name="assignedUserId"
          defaultValue={initial?.assignedUserId || ""}
          className="input"
        >
          <option value="">– niemand –</option>
          {teamMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Notizen">
        <textarea
          name="notes"
          rows={3}
          defaultValue={initial?.notes}
          className="input"
        />
      </Field>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-amber-700 px-4 py-3 text-base font-semibold text-white active:scale-[0.98] disabled:opacity-60"
      >
        {isPending ? "Speichert…" : entryId ? "Speichern" : "Anlegen"}
      </button>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-stone-300">{label}</span>
      {children}
    </label>
  );
}
