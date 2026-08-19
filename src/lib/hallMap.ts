/**
 * Schematische Übersicht der Koelnmesse-Hallen für die gamescom 2026 - KEIN
 * exaktes Architektur-/Wegeleitsystem, sondern ein grobes Nachbarschaftsmodell
 * auf Basis der öffentlichen Hallenplan-Beschreibung (zentraler Boulevard,
 * Business Area am Eingang Süd, Randbereiche für Indie/Merch/Arena). Dient als
 * "welche Hallen liegen ungefähr auf dem Weg" - keine präzise Routenführung.
 */
export type HallNode = {
  id: string;
  label: string;
  area: "business" | "entertainment" | "special";
  /** Grobe, nicht maßstabsgetreue Position für die Schema-Darstellung. */
  x: number;
  y: number;
};

export const HALL_NODES: HallNode[] = [
  { id: "2", label: "Halle 2", area: "business", x: 40, y: 260 },
  { id: "3", label: "Halle 3", area: "business", x: 40, y: 180 },
  { id: "4", label: "Halle 4", area: "business", x: 40, y: 100 },
  { id: "confex", label: "Confex", area: "business", x: 120, y: 260 },
  { id: "1", label: "Halle 1 (Arena)", area: "special", x: 200, y: 340 },
  { id: "5", label: "Halle 5 (Merch)", area: "special", x: 480, y: 340 },
  { id: "boulevard", label: "Boulevard", area: "entertainment", x: 320, y: 200 },
  { id: "6", label: "Halle 6", area: "entertainment", x: 200, y: 120 },
  { id: "7", label: "Halle 7", area: "entertainment", x: 280, y: 120 },
  { id: "8", label: "Halle 8", area: "entertainment", x: 360, y: 120 },
  { id: "9", label: "Halle 9", area: "entertainment", x: 440, y: 120 },
  { id: "10", label: "Halle 10 (Indie)", area: "special", x: 560, y: 200 },
  { id: "11", label: "Halle 11.2", area: "special", x: 560, y: 280 },
];

export const HALL_EDGES: [string, string][] = [
  ["2", "confex"],
  ["3", "confex"],
  ["4", "confex"],
  ["confex", "1"],
  ["1", "boulevard"],
  ["boulevard", "6"],
  ["6", "7"],
  ["7", "8"],
  ["8", "9"],
  ["9", "boulevard"],
  ["boulevard", "5"],
  ["5", "10"],
  ["10", "11"],
];

function buildAdjacency(): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();
  for (const node of HALL_NODES) adjacency.set(node.id, []);
  for (const [a, b] of HALL_EDGES) {
    adjacency.get(a)?.push(b);
    adjacency.get(b)?.push(a);
  }
  return adjacency;
}

const ADJACENCY = buildAdjacency();

/** Normalisiert freie Hallen-Angaben ("Halle 7", "7", "Hall 7") auf eine Knoten-ID. */
export function normalizeHallId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const match = raw.match(/(\d+(?:\.\d+)?)/);
  if (match && HALL_NODES.some((n) => n.id === match[1])) return match[1];
  const lower = raw.toLowerCase();
  if (lower.includes("confex")) return "confex";
  return null;
}

/** Kürzester Pfad (Anzahl Hallen-Knoten) zwischen zwei Hallen via Breitensuche. */
export function findHallPath(fromId: string, toId: string): string[] | null {
  if (!ADJACENCY.has(fromId) || !ADJACENCY.has(toId)) return null;
  if (fromId === toId) return [fromId];

  const queue: string[] = [fromId];
  const cameFrom = new Map<string, string>();
  const visited = new Set<string>([fromId]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === toId) break;
    for (const neighbor of ADJACENCY.get(current) || []) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      cameFrom.set(neighbor, current);
      queue.push(neighbor);
    }
  }

  if (!visited.has(toId)) return null;

  const path: string[] = [toId];
  let cursor = toId;
  while (cursor !== fromId) {
    const prev = cameFrom.get(cursor);
    if (!prev) return null;
    path.unshift(prev);
    cursor = prev;
  }
  return path;
}

/** Distanz als Anzahl Zwischenstationen (0 = gleiche Halle). Null wenn unbekannt/nicht verbunden. */
export function hallDistance(fromId: string | null, toId: string | null): number | null {
  if (!fromId || !toId) return null;
  const path = findHallPath(fromId, toId);
  return path ? path.length - 1 : null;
}

export function hallLabel(id: string): string {
  return HALL_NODES.find((n) => n.id === id)?.label || `Halle ${id}`;
}
