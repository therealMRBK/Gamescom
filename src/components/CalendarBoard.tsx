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

// Sensible default window — widened automatically (see computeHourRange)
// when an appointment falls outside it, so early/late slots never render
// with a negative/overflowing `top` above or below the visible grid.
const DEFAULT_BASE_HOUR = 9;
const DEFAULT_END_HOUR = 20;
const PX_PER_MINUTE = 1.6;

function computeHourRange(days: { appointments: CalendarAppointment[] }[]) {
  const all = days.flatMap((d) => d.appointments);
  if (all.length === 0) {
    return { baseHour: DEFAULT_BASE_HOUR, endHour: DEFAULT_END_HOUR };
  }
  const earliestStart = Math.min(...all.map((a) => a.startMinutes));
  const latestEnd = Math.max(...all.map((a) => a.endMinutes));
  return {
    baseHour: Math.min(DEFAULT_BASE_HOUR, Math.floor(earliestStart / 60)),
    endHour: Math.max(DEFAULT_END_HOUR, Math.ceil(latestEnd / 60)),
  };
}

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
  const { baseHour, endHour } = computeHourRange(days);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const dayKey = String(over.id);
    const activeRectTop = active.rect.current.translated?.top;
    const overRectTop = over.rect.top;
    if (activeRectTop == null) return;

    const relativeTop = activeRectTop - overRectTop;
    let newStartMinutes = baseHour * 60 + relativeTop / PX_PER_MINUTE;
    newStartMinutes = Math.round(newStartMinutes / 15) * 15;
    newStartMinutes = Math.max(
      baseHour * 60,
      Math.min(newStartMinutes, endHour * 60),
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
          <DayColumn
            key={day.date}
            day={day}
            pendingId={pending}
            baseHour={baseHour}
            endHour={endHour}
          />
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
  baseHour,
  endHour,
}: {
  day: { date: string; label: string; appointments: CalendarAppointment[] };
  pendingId: string | null;
  baseHour: number;
  endHour: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: day.date });
  const totalMinutes = (endHour - baseHour) * 60;
  const hours = Array.from(
    { length: endHour - baseHour + 1 },
    (_, i) => baseHour + i,
  );

  const lanes = layoutLanes(day.appointments);
  const maxLaneCount = lanes.reduce((max, l) => Math.max(max, l.laneCount), 1);
  // Widen the column when appointments overlap instead of squeezing lanes
  // to unreadable widths — this was the main cause of text getting cut off.
  const columnWidth = Math.max(260, maxLaneCount * MIN_LANE_WIDTH);

  return (
    <div className="shrink-0" style={{ width: columnWidth }}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-white">{day.label}</p>
        <Link
          href={`/calendar/new?day=${day.date}`}
          className="rounded-lg bg-stone-800 px-2 py-1 text-xs text-stone-300"
        >
          + Termin
        </Link>
      </div>
      <div
        ref={setNodeRef}
        className={`relative rounded-xl border ${isOver ? "border-amber-600 bg-amber-950/20" : "border-stone-800 bg-stone-900"}`}
        style={{ height: totalMinutes * PX_PER_MINUTE }}
      >
        {hours.map((h) => (
          <div
            key={h}
            className="absolute left-0 right-0 border-t border-stone-800/70 text-[10px] text-stone-600"
            style={{ top: (h - baseHour) * 60 * PX_PER_MINUTE }}
          >
            <span className="font-console tabular-nums absolute -top-2 left-1 bg-stone-900 px-0.5">{h}:00</span>
          </div>
        ))}

        {lanes.map(({ appt, lane, laneCount }) => (
          <AppointmentBlock
            key={appt.id}
            appt={appt}
            isPending={pendingId === appt.id}
            lane={lane}
            laneCount={laneCount}
            baseHour={baseHour}
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

/** Minimum readable width per lane — below this, text gets crushed and
 * truncated no matter what we do inside the block, so the column itself
 * has to grow instead of squeezing lanes forever. */
const MIN_LANE_WIDTH = 130;

function AppointmentBlock({
  appt,
  isPending,
  lane,
  laneCount,
  baseHour,
}: {
  appt: CalendarAppointment;
  isPending: boolean;
  lane: number;
  laneCount: number;
  baseHour: number;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: appt.id,
    data: { duration: appt.endMinutes - appt.startMinutes },
  });

  const top = (appt.startMinutes - baseHour * 60) * PX_PER_MINUTE;
  const height = Math.max(
    (appt.endMinutes - appt.startMinutes) * PX_PER_MINUTE,
    34,
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
        : "border-amber-600";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`absolute touch-none overflow-hidden rounded-lg border-l-4 ${borderColor} bg-stone-800 p-1.5 shadow-md active:cursor-grabbing`}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="line-clamp-2 text-[11px] font-semibold leading-tight text-white">
          <span className="font-console tabular-nums text-amber-500">
            {formatMinutes(appt.startMinutes)}
          </span>{" "}
          {appt.title}
        </p>
        <Link
          href={`/calendar/${appt.id}/edit`}
          onPointerDown={(e) => e.stopPropagation()}
          className="shrink-0 text-[11px] text-stone-400"
        >
          ✏️
        </Link>
      </div>
      {height > 40 && (
        <p className="line-clamp-2 text-[10px] leading-tight text-stone-400">
          {appt.publisherName}
          {appt.hall ? ` · Halle ${appt.hall}` : ""}
          {appt.stand ? ` / Stand ${appt.stand}` : ""}
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
