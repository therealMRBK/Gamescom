"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createPublisherEntry,
  updatePublisherEntry,
  type PublisherEntryInput,
} from "@/lib/actions/publishers";
import {
  CATEGORY_LABELS,
  CONTACT_CHANNEL_LABELS,
  PRIORITY_LABELS,
} from "@/lib/constants";

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
  const [gamesText, setGamesText] = useState(
    (initial?.games || []).join(", "),
  );

  return (
    <form
      className="space-y-4"
      action={(formData: FormData) => {
        const input: PublisherEntryInput = {
          publisher: String(formData.get("publisher") || ""),
          games: gamesText
            .split(",")
            .map((g) => g.trim())
            .filter(Boolean),
          hall: String(formData.get("hall") || ""),
          priority: formData.get("priority") as PublisherEntryInput["priority"],
          category:
            (formData.get("category") as PublisherEntryInput["category"]) ||
            null,
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
            router.push(`/publishers/${entryId}`);
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
          defaultValue={initial?.publisher}
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

      <div className="grid grid-cols-2 gap-3">
        <Field label="Halle/Stand">
          <input name="hall" defaultValue={initial?.hall} className="input" />
        </Field>
        <Field label="Priorität">
          <select
            name="priority"
            defaultValue={initial?.priority || "MITTEL"}
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
            defaultValue={initial?.category || ""}
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
        className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-base font-semibold text-white active:scale-[0.98] disabled:opacity-60"
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
      <span className="mb-1 block text-sm text-slate-300">{label}</span>
      {children}
    </label>
  );
}
