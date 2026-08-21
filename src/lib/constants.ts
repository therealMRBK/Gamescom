// Only the days actually on-site matter (Mi-So) — the earlier "dev"/ONL
// days before the show floor opens aren't tracked here.
export const EVENT_DAYS = [
  { date: "2026-08-26", label: "Mi 26.08.", phase: "Fachbesucher/Medien" },
  { date: "2026-08-27", label: "Do 27.08.", phase: "Publikum" },
  { date: "2026-08-28", label: "Fr 28.08.", phase: "Publikum" },
  { date: "2026-08-29", label: "Sa 29.08.", phase: "Publikum" },
  { date: "2026-08-30", label: "So 30.08.", phase: "Publikum" },
] as const;

export const BUFFER_MINUTES = 25;

export const PRIORITY_LABELS: Record<string, string> = {
  HOCH: "Hoch",
  MITTEL: "Mittel",
  NIEDRIG: "Niedrig",
};

export const PRIORITY_COLORS: Record<string, string> = {
  HOCH: "bg-red-500/15 text-red-300 ring-1 ring-red-500/30",
  MITTEL: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
  NIEDRIG: "bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/30",
};

export const CATEGORY_LABELS: Record<string, string> = {
  AAA: "AAA",
  SIMULATION: "Simulation",
  INDIE: "Indie",
  SONSTIGE: "Sonstige",
};

export const CONTACT_CHANNEL_LABELS: Record<string, string> = {
  GAMESCOM_BIZ: "gamescom biz",
  MEET_TO_MATCH: "MeetToMatch",
  DIREKT_EMAIL: "Direkt-E-Mail",
  GAMES_PRESS: "Games Press",
  SONSTIGE: "Sonstige",
};

export const CONTACT_STATUS_LABELS: Record<string, string> = {
  NICHT_KONTAKTIERT: "Nicht kontaktiert",
  ANGEFRAGT: "Angefragt",
  NACHGEFASST: "Nachgefasst",
  BESTAETIGT: "Bestätigt",
  ABGELEHNT: "Abgelehnt",
};

export const CONTACT_STATUS_COLORS: Record<string, string> = {
  NICHT_KONTAKTIERT: "bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/30",
  ANGEFRAGT: "bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/30",
  NACHGEFASST: "bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/30",
  BESTAETIGT: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
  ABGELEHNT: "bg-red-500/15 text-red-300 ring-1 ring-red-500/30",
};

export const CONTACT_STATUS_ORDER = [
  "NICHT_KONTAKTIERT",
  "ANGEFRAGT",
  "NACHGEFASST",
  "BESTAETIGT",
  "ABGELEHNT",
] as const;

export const FOCUS_AREA_LABELS: Record<string, string> = {
  VIDEO: "Video",
  ARTIKEL: "Artikel",
  SOCIAL: "Social",
};

export const CONTENT_FORMAT_LABELS: Record<string, string> = {
  HANDS_ON: "Hands-on-Preview",
  ARTIKEL: "Artikel",
  SOCIAL_LIVE: "Social-Live-Coverage",
  REVIEW: "Review",
};

export const CONTENT_STATUS_LABELS: Record<string, string> = {
  GEPLANT: "Geplant",
  AUFNAHME_GEMACHT: "Notizen/Aufnahme gemacht",
  ENTWURF: "Entwurf",
  VEROEFFENTLICHT: "Veröffentlicht",
};

export const CONTENT_STATUS_ORDER = [
  "GEPLANT",
  "AUFNAHME_GEMACHT",
  "ENTWURF",
  "VEROEFFENTLICHT",
] as const;

export const CONTENT_STATUS_COLORS: Record<string, string> = {
  GEPLANT: "bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/30",
  AUFNAHME_GEMACHT: "bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/30",
  ENTWURF: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
  VEROEFFENTLICHT: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
};
