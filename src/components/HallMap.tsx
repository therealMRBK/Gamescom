"use client";

import { useMemo, useState } from "react";
import {
  HALL_NODES,
  HALL_EDGES,
  findHallPath,
  hallLabel,
  HALLPLAN_IMAGE,
  HALLPLAN_IMAGE_WIDTH,
  HALLPLAN_IMAGE_HEIGHT,
  type HallNode,
} from "@/lib/hallMap";

const VIEWBOX = `0 0 ${HALLPLAN_IMAGE_WIDTH} ${HALLPLAN_IMAGE_HEIGHT}`;

const AREA_COLORS: Record<HallNode["area"], string> = {
  business: "#7c3aed",
  entertainment: "#0ea5e9",
  special: "#f59e0b",
  entrance: "#f5f5f4",
};

export function HallMap() {
  const routableNodes = HALL_NODES.filter((n) => n.area !== "entrance");
  const [from, setFrom] = useState(routableNodes[0].id);
  const [to, setTo] = useState(routableNodes[routableNodes.length - 1].id);
  const [path, setPath] = useState<string[] | null | undefined>(undefined);

  const pathEdgeSet = useMemo(() => {
    if (!path) return new Set<string>();
    const set = new Set<string>();
    for (let i = 0; i < path.length - 1; i++) {
      set.add(`${path[i]}-${path[i + 1]}`);
      set.add(`${path[i + 1]}-${path[i]}`);
    }
    return set;
  }, [path]);

  const pathNodeSet = useMemo(() => new Set(path || []), [path]);

  function nodeById(id: string) {
    return HALL_NODES.find((n) => n.id === id)!;
  }

  return (
    <div className="space-y-3">
      <p className="rounded-lg bg-amber-950/40 px-3 py-2 text-xs text-amber-300 ring-1 ring-amber-900">
        Offizieller gamescom-2026-Hallenplan (Köln, 26.–30.08.2026) mit
        Marken für Routen zwischen Hallen/Eingängen - Nachbarschaften aus dem
        Plan abgelesen, aber ohne exakte Innenraum-Wegeleitung.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-sm text-stone-300">Von</span>
          <select value={from} onChange={(e) => setFrom(e.target.value)} className="input">
            {HALL_NODES.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-stone-300">Nach</span>
          <select value={to} onChange={(e) => setTo(e.target.value)} className="input">
            {HALL_NODES.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="button"
        onClick={() => setPath(findHallPath(from, to))}
        className="w-full rounded-xl bg-amber-700 px-4 py-3 text-base font-semibold text-white active:scale-[0.98]"
      >
        Route anzeigen
      </button>

      <div className="overflow-x-auto rounded-xl bg-stone-900 ring-1 ring-stone-800">
        <svg viewBox={VIEWBOX} className="h-auto w-full min-w-[680px]">
          <image
            href={HALLPLAN_IMAGE}
            x={0}
            y={0}
            width={HALLPLAN_IMAGE_WIDTH}
            height={HALLPLAN_IMAGE_HEIGHT}
          />

          {HALL_EDGES.map(([a, b]) => {
            const na = nodeById(a);
            const nb = nodeById(b);
            const onPath = pathEdgeSet.has(`${a}-${b}`);
            if (!onPath) return null;
            return (
              <line
                key={`${a}-${b}`}
                x1={na.x}
                y1={na.y}
                x2={nb.x}
                y2={nb.y}
                stroke="#f59e0b"
                strokeWidth={6}
                strokeLinecap="round"
                opacity={0.85}
              />
            );
          })}

          {HALL_NODES.map((n) => {
            const onPath = pathNodeSet.has(n.id);
            const isEndpoint = n.id === from || n.id === to;
            const radius = isEndpoint ? 20 : onPath ? 15 : 11;
            return (
              <circle
                key={n.id}
                cx={n.x}
                cy={n.y}
                r={radius}
                fill={onPath ? "#f59e0b" : AREA_COLORS[n.area]}
                fillOpacity={onPath ? 0.95 : 0.55}
                stroke={isEndpoint ? "#fff7ed" : "#1c1917"}
                strokeWidth={isEndpoint ? 4 : 2}
              />
            );
          })}
        </svg>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-stone-500">
        <LegendDot color={AREA_COLORS.business} label="Business Area" />
        <LegendDot color={AREA_COLORS.entertainment} label="Entertainment Area" />
        <LegendDot color={AREA_COLORS.special} label="Arena / Indie / Merch" />
        <LegendDot color={AREA_COLORS.entrance} label="Eingang" />
      </div>

      {path && (
        <div className="rounded-xl bg-stone-900 p-3 text-sm text-stone-200 ring-1 ring-stone-800">
          <p className="mb-1 font-semibold text-white">Route:</p>
          <p>{path.map((id) => hallLabel(id)).join(" → ")}</p>
        </div>
      )}
      {path === null && (
        <p className="text-xs text-stone-500">
          Keine Verbindung zwischen diesen Hallen im Schema gefunden.
        </p>
      )}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
