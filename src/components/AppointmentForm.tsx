"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createAppointment,
  updateAppointment,
} from "@/lib/actions/appointments";
import { suggestAppointmentSlots, type SlotSuggestionResult } from "@/lib/actions/scheduling";
import { EVENT_DAYS } from "@/lib/constants";
import { dateTimeLocalToUtcWall, wallDateKey } from "@/lib/dates";

type PublisherOption = { id: string; publisher: string };
type TeamMember = { id: string; name: string };

export function AppointmentForm({
  appointmentId,
  initial,
  publishers,
  teamMembers,
  defaultDay,
  defaultTitle,
  defaultPublisherEntryId,
  defaultStartTime,
}: {
  appointmentId?: string;
  initial?: {
    title: string;
    publisherEntryId?: string | null;
    startTime: Date;
    endTime: Date;
    hall?: string | null;
    stand?: string | null;
    notes?: string | null;
    assignedUserIds: string[];
  };
  publishers: PublisherOption[];
  teamMembers: TeamMember[];
  defaultDay?: string;
  defaultTitle?: string;
  defaultPublisherEntryId?: string;
  defaultStartTime?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const initialDay = initial ? wallDateKey(initial.startTime) : defaultDay || EVENT_DAYS[0].date;
  const initialStart = initial
    ? initial.startTime.toISOString().slice(11, 16)
    : defaultStartTime || "10:00";
  const initialEnd = initial
    ? initial.endTime.toISOString().slice(11, 16)
    : addMinutes(initialStart, 30);

  const [day, setDay] = useState(initialDay);
  const [startTime, setStartTime] = useState(initialStart);
  const [endTime, setEndTime] = useState(initialEnd);
  const [publisherEntryId, setPublisherEntryId] = useState(
    initial?.publisherEntryId || defaultPublisherEntryId || "",
  );

  const [isSuggesting, startSuggesting] = useTransition();
  const [suggestions, setSuggestions] = useState<SlotSuggestionResult[] | null>(null);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  function requestSuggestions() {
    setSuggestError(null);
    const duration = Math.max(15, minutesBetween(startTime, endTime));
    startSuggesting(async () => {
      const result = await suggestAppointmentSlots({
        publisherEntryId: publisherEntryId || null,
        durationMinutes: duration,
      });
      if (result.ok) {
        setSuggestions(result.value);
      } else {
        setSuggestError(result.error);
      }
    });
  }

  function applySuggestion(s: SlotSuggestionResult) {
    setDay(s.day);
    setStartTime(s.startTime);
    setEndTime(s.endTime);
  }

  return (
    <form
      className="space-y-4"
      action={(formData: FormData) => {
        const assignedUserIds = formData.getAll("assignedUserIds").map(String);

        const input = {
          title: String(formData.get("title") || ""),
          publisherEntryId: String(formData.get("publisherEntryId") || "") || null,
          startTime: dateTimeLocalToUtcWall(`${day}T${startTime}`).toISOString(),
          endTime: dateTimeLocalToUtcWall(`${day}T${endTime}`).toISOString(),
          hall: String(formData.get("hall") || ""),
          stand: String(formData.get("stand") || ""),
          notes: String(formData.get("notes") || ""),
          assignedUserIds,
        };

        startTransition(async () => {
          if (appointmentId) {
            await updateAppointment(appointmentId, input);
          } else {
            await createAppointment(input);
          }
          router.push(`/calendar?view=day&day=${day}`);
        });
      }}
    >
      <label className="block">
        <span className="mb-1 block text-sm text-stone-300">Titel</span>
        <input
          name="title"
          required
          defaultValue={initial?.title ?? defaultTitle ?? ""}
          className="input"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm text-stone-300">Verknüpfter Publisher</span>
        <select
          name="publisherEntryId"
          value={publisherEntryId}
          onChange={(e) => setPublisherEntryId(e.target.value)}
          className="input"
        >
          <option value="">– keiner –</option>
          {publishers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.publisher}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm text-stone-300">Messetag</span>
        <select
          name="day"
          value={day}
          onChange={(e) => setDay(e.target.value)}
          className="input"
        >
          {EVENT_DAYS.map((d) => (
            <option key={d.date} value={d.date}>
              {d.label} · {d.phase}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-sm text-stone-300">Start</span>
          <input
            type="time"
            name="startTime"
            required
            value={startTime}
            onChange={(e) => {
              setStartTime(e.target.value);
              setEndTime(addMinutes(e.target.value, 30));
            }}
            className="input"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-stone-300">Ende</span>
          <input
            type="time"
            name="endTime"
            required
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="input"
          />
        </label>
      </div>

      {!appointmentId && (
        <div className="rounded-xl bg-stone-900 p-3 ring-1 ring-stone-800">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-stone-300">Terminvorschlag (KI)</span>
            <button
              type="button"
              disabled={isSuggesting}
              onClick={requestSuggestions}
              className="rounded-lg bg-stone-800 px-2 py-1 text-xs text-amber-400 disabled:opacity-50"
            >
              {isSuggesting ? "Sucht…" : "✨ Slots vorschlagen"}
            </button>
          </div>
          {suggestError && <p className="text-xs text-red-400">{suggestError}</p>}
          {!suggestions && !suggestError && (
            <p className="text-xs text-stone-500">
              Berücksichtigt bestehende Termine, freie Zeitfenster und Nähe zur Halle des
              vorigen Termins.
            </p>
          )}
          {suggestions && suggestions.length === 0 && (
            <p className="text-xs text-stone-500">Keine freien Slots in dieser Dauer gefunden.</p>
          )}
          {suggestions && suggestions.length > 0 && (
            <ul className="space-y-1.5">
              {suggestions.map((s, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => applySuggestion(s)}
                    className="w-full rounded-lg bg-stone-800 px-3 py-2 text-left text-xs text-stone-200 active:bg-stone-700"
                  >
                    <span className="font-console tabular-nums text-amber-500">
                      {s.dayLabel} · {s.startTime}–{s.endTime}
                    </span>
                    <span className="block text-stone-400">{s.reason}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-sm text-stone-300">Halle</span>
          <input name="hall" defaultValue={initial?.hall || ""} className="input" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-stone-300">Stand</span>
          <input name="stand" defaultValue={initial?.stand || ""} className="input" />
        </label>
      </div>

      <div>
        <span className="mb-1 block text-sm text-stone-300">Zugewiesene Teammitglieder</span>
        <div className="flex flex-wrap gap-2">
          {teamMembers.map((m) => (
            <label
              key={m.id}
              className="flex items-center gap-1.5 rounded-full bg-stone-800 px-3 py-2 text-sm text-stone-200"
            >
              <input
                type="checkbox"
                name="assignedUserIds"
                value={m.id}
                defaultChecked={initial?.assignedUserIds?.includes(m.id)}
                className="h-4 w-4"
              />
              {m.name}
            </label>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm text-stone-300">Notizen</span>
        <textarea name="notes" rows={3} defaultValue={initial?.notes || ""} className="input" />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-amber-700 px-4 py-3 text-base font-semibold text-white active:scale-[0.98] disabled:opacity-60"
      >
        {isPending ? "Speichert…" : appointmentId ? "Speichern" : "Termin anlegen"}
      </button>
    </form>
  );
}

function addMinutes(time: string, minutesToAdd: number): string {
  const [hh, mm] = time.split(":").map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return time;
  const total = (hh * 60 + mm + minutesToAdd + 24 * 60) % (24 * 60);
  const newHh = Math.floor(total / 60);
  const newMm = total % 60;
  return `${String(newHh).padStart(2, "0")}:${String(newMm).padStart(2, "0")}`;
}

function minutesBetween(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some(Number.isNaN)) return 30;
  return (eh * 60 + em - (sh * 60 + sm) + 24 * 60) % (24 * 60);
}
