"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createAppointment,
  updateAppointment,
} from "@/lib/actions/appointments";
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
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const initialDay = initial ? wallDateKey(initial.startTime) : defaultDay || EVENT_DAYS[0].date;
  const initialStart = initial
    ? initial.startTime.toISOString().slice(11, 16)
    : "10:00";
  const initialEnd = initial ? initial.endTime.toISOString().slice(11, 16) : "10:30";

  return (
    <form
      className="space-y-4"
      action={(formData: FormData) => {
        const day = String(formData.get("day"));
        const startTime = String(formData.get("startTime"));
        const endTime = String(formData.get("endTime"));
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
          router.push("/calendar");
        });
      }}
    >
      <label className="block">
        <span className="mb-1 block text-sm text-slate-300">Titel</span>
        <input name="title" required defaultValue={initial?.title} className="input" />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm text-slate-300">Verknüpfter Publisher</span>
        <select
          name="publisherEntryId"
          defaultValue={initial?.publisherEntryId || ""}
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
        <span className="mb-1 block text-sm text-slate-300">Messetag</span>
        <select name="day" defaultValue={initialDay} className="input">
          {EVENT_DAYS.map((d) => (
            <option key={d.date} value={d.date}>
              {d.label} · {d.phase}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-sm text-slate-300">Start</span>
          <input
            type="time"
            name="startTime"
            required
            defaultValue={initialStart}
            className="input"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-slate-300">Ende</span>
          <input
            type="time"
            name="endTime"
            required
            defaultValue={initialEnd}
            className="input"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-sm text-slate-300">Halle</span>
          <input name="hall" defaultValue={initial?.hall || ""} className="input" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-slate-300">Stand</span>
          <input name="stand" defaultValue={initial?.stand || ""} className="input" />
        </label>
      </div>

      <div>
        <span className="mb-1 block text-sm text-slate-300">Zugewiesene Teammitglieder</span>
        <div className="flex flex-wrap gap-2">
          {teamMembers.map((m) => (
            <label
              key={m.id}
              className="flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-2 text-sm text-slate-200"
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
        <span className="mb-1 block text-sm text-slate-300">Notizen</span>
        <textarea name="notes" rows={3} defaultValue={initial?.notes || ""} className="input" />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-base font-semibold text-white active:scale-[0.98] disabled:opacity-60"
      >
        {isPending ? "Speichert…" : appointmentId ? "Speichern" : "Termin anlegen"}
      </button>
    </form>
  );
}
