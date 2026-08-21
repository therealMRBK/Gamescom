/**
 * Minimal RFC 5545 calendar invite builder — just enough for a
 * REQUEST (create/update) or CANCEL of a single VEVENT. Hand-rolled
 * rather than pulling in a library: the two methods we need plus
 * correct escaping/folding is a small, well-specified surface, and the
 * popular `ics` package doesn't cover METHOD:CANCEL cleanly.
 */

function foldLine(line: string): string {
  // RFC 5545 §3.1: lines SHOULD be folded at 75 octets, continuation
  // lines start with a single space. Not all calendar apps require
  // this, but some strict parsers do.
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  let result = "";
  let chunk = "";
  let chunkBytes = 0;
  for (const char of line) {
    const charBytes = Buffer.byteLength(char, "utf8");
    if (chunkBytes + charBytes > 74) {
      result += (result ? "\r\n " : "") + chunk;
      chunk = "";
      chunkBytes = 0;
    }
    chunk += char;
    chunkBytes += charBytes;
  }
  result += (result ? "\r\n " : "") + chunk;
  return result;
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function toUtcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export type IcsEventInput = {
  uid: string;
  sequence: number;
  method: "REQUEST" | "CANCEL";
  title: string;
  startTime: Date;
  endTime: Date;
  location?: string | null;
  description?: string | null;
  organizerEmail: string;
  organizerName?: string;
  attendeeEmail: string;
  attendeeName?: string;
};

export function buildIcsInvite(input: IcsEventInput): string {
  const status = input.method === "CANCEL" ? "CANCELLED" : "CONFIRMED";
  const lines = [
    "BEGIN:VCALENDAR",
    "PRODID:-//Gamescom Command Center//DE",
    "VERSION:2.0",
    `METHOD:${input.method}`,
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${input.uid}`,
    `DTSTAMP:${toUtcStamp(new Date())}`,
    `DTSTART:${toUtcStamp(input.startTime)}`,
    `DTEND:${toUtcStamp(input.endTime)}`,
    `SEQUENCE:${input.sequence}`,
    `STATUS:${status}`,
    `SUMMARY:${escapeText(input.title)}`,
    ...(input.location ? [`LOCATION:${escapeText(input.location)}`] : []),
    ...(input.description ? [`DESCRIPTION:${escapeText(input.description)}`] : []),
    `ORGANIZER;CN=${escapeText(input.organizerName || input.organizerEmail)}:mailto:${input.organizerEmail}`,
    `ATTENDEE;CN=${escapeText(input.attendeeName || input.attendeeEmail)};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${input.attendeeEmail}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
