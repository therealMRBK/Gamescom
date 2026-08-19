"use client";

import { useMemo, useState } from "react";
import { HALL_NODES, HALL_EDGES, findHallPath, hallLabel } from "@/lib/hallMap";

const VIEWBOX = "0 0 620 400";

export function HallMap() {
  const [from, setFrom] = useState(HALL_NODES[0].id);
  const [to, setTo] = useState(HALL_NODES[HALL_NODES.length - 1].id);
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
        Schematische Übersicht (nicht maßstabsgetreu, keine exakte
        Innenraum-Wegeleitung) - zeigt grob, welche Hallenbereiche auf dem Weg liegen.
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

      <div className="overflow-x-auto rounded-xl bg-stone-900 p-2 ring-1 ring-stone-800">
        <svg viewBox={VIEWBOX} className="h-auto w-full min-w-[560px]">
          {HALL_EDGES.map(([a, b]) => {
            const na = nodeById(a);
            const nb = nodeById(b);
            const onPath = pathEdgeSet.has(`${a}-${b}`);
            return (
              <line
                key={`${a}-${b}`}
                x1={na.x}
                y1={na.y}
                x2={nb.x}
                y2={nb.y}
                stroke={onPath ? "#d97706" : "#44403c"}
                strokeWidth={onPath ? 4 : 2}
              />
            );
          })}
          {HALL_NODES.map((n) => {
            const onPath = pathNodeSet.has(n.id);
            const isEndpoint = n.id === from || n.id === to;
            return (
              <g key={n.id}>
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={isEndpoint ? 20 : 16}
                  fill={onPath ? "#b45309" : "#292524"}
                  stroke={isEndpoint ? "#f59e0b" : "#57534e"}
                  strokeWidth={isEndpoint ? 3 : 1.5}
                />
                <text
                  x={n.x}
                  y={n.y + 34}
                  textAnchor="middle"
                  fontSize="11"
                  fill={onPath ? "#fbbf24" : "#a8a29e"}
                >
                  {n.label}
                </text>
              </g>
            );
          })}
        </svg>
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
