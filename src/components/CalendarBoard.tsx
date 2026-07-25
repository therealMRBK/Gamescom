"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DndContext,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { rescheduleAppointment } from "@/lib/actions/appointments";

const BASE_HOUR = 9;
const END_HOUR = 20;
const PX_PER_MINUTE = 1.6;
const TOTAL_MINUTES = (END_HOUR - BASE_HOUR) * 60;

export type CalendarAppointment = {
  id: string;
  title: string;
  startMinutes: number;
  endMinutes: number;
  hall: string | null;
  stand: string | null;
  publisherName: string | null;
  assignees: { id: string; name: string; color: string }[];
  conflict: "overlap" | "buffer" | null;
  conflictGapMinutes?: number;
};

export function CalendarBoard({
  days,
}: {
  days: { date: string; label: string; appointments: CalendarAppointment[] }[];
}) {
  const [pending, setPending] = useState<string | null>(null);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const dayKey = String(over.id);
    const activeRectTop = active.rect.current.translated?.top;
    const overRectTop = over.rect.top;
    if (activeRectTop == null) return;

    const relativeTop = activeRectTop - overRectTop;
    let newStartMinutes = BASE_HOUR * 60 + relativeTop / PX_PER_MINUTE;
    newStartMinutes = Math.round(newStartMinutes / 15) * 15;
    newStartMinutes = Math.max(
      BASE_HOUR * 60,
      Math.min(newStartMinutes, END_HOUR * 60),
    );

    const duration = (active.data.current?.duration as number) ?? 30;
    const newEndMinutes = newStartMinutes + duration;

    const startTime = minutesToIso(dayKey, newStartMinutes);
    const endTime = minutesToIso(dayKey, newEndMinutes);

    setPending(String(active.id));
    rescheduleAppointment(String(active.id), startTime, endTime).finally(() =>
      setPending(null),
    );
  }

  return (
    <DndContext id="calendar-board" onDragEnd={handleDragEnd}>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-4">
        {days.map((day) => (
          <DayColumn key={day.date} day={day} pendingId={pending} />
        ))}
      </div>
    </DndContext>
  );
}

function minutesToIso(dayKey: string, minutes: number): string {
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return new Date(`${dayKey}T${hh}:${mm}:00.000Z`).toISOString();
}

function DayColumn({
  day,
  pendingId,
}: {
  day: { date: string; label: string; appointments: CalendarAppointment[] };
  pendingId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: day.date });
  const hours = Array.from(
    { length: END_HOUR - BASE_HOUR + 1 },
    (_, i) => BASE_HOUR + i,
  );

  return (
    <div className="w-[260px] shrink-0">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-white">{day.label}</p>
        <Link
          href={`/calendar/new?day=${day.date}`}
          className="rounded-lg bg-slate-800 px-2 py-1 text-xs text-slate-300"
        >
          + Termin
        </Link>
      </div>
      <div
        ref={setNodeRef}
        className={`relative rounded-xl border ${isOver ? "border-indigo-500 bg-indigo-950/20" : "border-slate-800 bg-slate-900"}`}
        style={{ height: TOTAL_MINUTES * PX_PER_MINUTE }}
      >
        {hours.map((h) => (
          <div
            key={h}
            className="absolute left-0 right-0 border-t border-slate-800/70 text-[10px] text-slate-600"
            style={{ top: (h - BASE_HOUR) * 60 * PX_PER_MINUTE }}
          >
            <span className="absolute -top-2 left-1 bg-slate-900 px-0.5">{h}:00</span>
          </div>
        ))}

        {layoutLanes(day.appointments).map(({ appt, lane, laneCount }) => (
          <AppointmentBlock
            key={appt.id}
            appt={appt}
            isPending={pendingId === appt.id}
            lane={lane}
            laneCount={laneCount}
          />
        ))}
      </div>
    </div>
  );
}

/** Simple sweep-line lane assignment so overlapping appointments sit side-by-side instead of stacking. */
function layoutLanes(appointments: CalendarAppointment[]) {
  const sorted = [...appointments].sort((a, b) => a.startMinutes - b.startMinutes);
  const laneEnds: number[] = [];
  const withLane = sorted.map((appt) => {
    let lane = laneEnds.findIndex((end) => end <= appt.startMinutes);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(appt.endMinutes);
    } else {
      laneEnds[lane] = appt.endMinutes;
    }
    return { appt, lane };
  });
  const laneCount = Math.max(1, laneEnds.length);
  return withLane.map(({ appt, lane }) => ({ appt, lane, laneCount }));
}

function AppointmentBlock({
  appt,
  isPending,
  lane,
  laneCount,
}: {
  appt: CalendarAppointment;
  isPending: boolean;
  lane: number;
  laneCount: number;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: appt.id,
    data: { duration: appt.endMinutes - appt.startMinutes },
  });

  const top = (appt.startMinutes - BASE_HOUR * 60) * PX_PER_MINUTE;
  const height = Math.max(
    (appt.endMinutes - appt.startMinutes) * PX_PER_MINUTE,
    28,
  );

  const laneWidth = 100 / laneCount;

  const style: React.CSSProperties = {
    top,
    height,
    left: `calc(${lane * laneWidth}% + 2px)`,
    width: `calc(${laneWidth}% - 4px)`,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    zIndex: isDragging ? 30 : 10,
    opacity: isPending ? 0.5 : 1,
  };

  const borderColor =
    appt.conflict === "overlap"
      ? "border-red-500"
      : appt.conflict === "buffer"
        ? "border-amber-500"
        : "border-indigo-500";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`absolute touch-none overflow-hidden rounded-lg border-l-4 ${borderColor} bg-slate-800 p-1.5 shadow-md active:cursor-grabbing`}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="truncate text-[11px] font-semibold text-white">
          {formatMinutes(appt.startMinutes)} {appt.title}
        </p>
        <Link
          href={`/calendar/${appt.id}/edit`}
          onPointerDown={(e) => e.stopPropagation()}
          className="shrink-0 text-[11px] text-slate-400"
        >
          ✏️
        </Link>
      </div>
      {height > 40 && (
        <p className="truncate text-[10px] text-slate-400">
          {appt.publisherName}
          {appt.hall ? ` · Halle ${appt.hall}` : ""}
        </p>
      )}
      {appt.assignees.length > 0 && height > 55 && (
        <div className="mt-0.5 flex flex-wrap gap-0.5">
          {appt.assignees.map((a) => (
            <span
              key={a.id}
              className="rounded px-1 text-[9px] text-white"
              style={{ backgroundColor: a.color }}
            >
              {a.name.split(" ")[0]}
            </span>
          ))}
        </div>
      )}
      {appt.conflict && (
        <p className="mt-0.5 truncate text-[9px] font-semibold text-amber-300">
          {appt.conflict === "overlap"
            ? "⚠ Überschneidung"
            : `⚠ nur ${appt.conflictGapMinutes} min Puffer`}
        </p>
      )}
    </div>
  );
}

function formatMinutes(minutes: number): string {
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}
