/**
 * Hallen-Übersicht für die gamescom 2026, kalibriert auf den offiziellen
 * "Hall Allocation"-Plan (Köln, 26.-30.08.2026, Stand Juni 2026, vom Nutzer
 * bereitgestellt - liegt als Bild unter /public/hallplan/gamescom-2026-hallplan.webp,
 * Originalgröße 1400x990px). Die x/y-Koordinaten hier sind Pixelpositionen auf
 * genau diesem Bild, damit die Marker im UI direkt auf der echten Karte sitzen.
 * Nachbarschaften (welche Halle grenzt an welche) sind visuell aus dem Plan
 * abgelesen - für Routen "welche Hallen liegen dazwischen", nicht für
 * Meter-genaue Innenraum-Wegeleitung (Gänge, Treppen, Aufzüge).
 */
export type HallNode = {
  id: string;
  label: string;
  area: "business" | "entertainment" | "special" | "entrance";
  /** Pixelposition auf gamescom-2026-hallplan.webp (1400x990). */
  x: number;
  y: number;
};

export const HALLPLAN_IMAGE = "/hallplan/gamescom-2026-hallplan.webp";
export const HALLPLAN_IMAGE_WIDTH = 1400;
export const HALLPLAN_IMAGE_HEIGHT = 990;

export const HALL_NODES: HallNode[] = [
  { id: "11", label: "Halle 11 (Creator Co-Working)", area: "special", x: 295, y: 373 },
  { id: "3", label: "Halle 3 (Business Area)", area: "business", x: 453, y: 313 },
  { id: "2", label: "Halle 2 (Business Area)", area: "business", x: 513, y: 277 },
  { id: "confex", label: "Confex (Business Area)", area: "business", x: 578, y: 218 },
  { id: "1", label: "Halle 1 (Event Arena)", area: "special", x: 793, y: 275 },
  { id: "4", label: "Halle 4 (Business Area)", area: "business", x: 675, y: 322 },
  { id: "5", label: "Halle 5 (Merch/Cards/Dev)", area: "special", x: 778, y: 355 },
  { id: "boulevard", label: "Boulevard", area: "entertainment", x: 650, y: 410 },
  { id: "6", label: "Halle 6 (Entertainment)", area: "entertainment", x: 915, y: 412 },
  { id: "7", label: "Halle 7 (Entertainment)", area: "entertainment", x: 1083, y: 465 },
  { id: "8", label: "Halle 8 (Entertainment)", area: "entertainment", x: 1197, y: 552 },
  { id: "9", label: "Halle 9 (Entertainment)", area: "entertainment", x: 748, y: 580 },
  { id: "10", label: "Halle 10 (Indie/Retro & Family)", area: "special", x: 562, y: 468 },
  { id: "entrance_west", label: "Eingang West", area: "entrance", x: 645, y: 240 },
  { id: "entrance_south", label: "Eingang Süd", area: "entrance", x: 300, y: 290 },
  { id: "entrance_east", label: "Eingang Ost", area: "entrance", x: 390, y: 545 },
  { id: "entrance_north", label: "Eingang Nord", area: "entrance", x: 1080, y: 660 },
];

export const HALL_EDGES: [string, string][] = [
  ["11", "3"],
  ["3", "2"],
  ["2", "confex"],
  ["confex", "1"],
  ["confex", "4"],
  ["4", "5"],
  ["5", "boulevard"],
  ["boulevard", "6"],
  ["6", "7"],
  ["7", "8"],
  ["8", "9"],
  ["9", "10"],
  ["10", "11"],
  ["entrance_west", "confex"],
  ["entrance_west", "1"],
  ["entrance_south", "11"],
  ["entrance_south", "3"],
  ["entrance_east", "10"],
  ["entrance_north", "8"],
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

/** Normalisiert freie Hallen-Angaben ("Halle 7", "7", "Hall 7", "Confex") auf eine Knoten-ID. */
export function normalizeHallId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower.includes("confex")) return "confex";
  const match = raw.match(/(\d+)/);
  if (match && HALL_NODES.some((n) => n.id === match[1])) return match[1];
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
