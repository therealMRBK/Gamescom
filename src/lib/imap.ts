import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

export type ImapAccountCredentials = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
};

export type FetchedEmail = {
  uid: number;
  subject: string;
  from: string;
  date: Date | null;
  text: string;
};

/** Grobe Vorfilterung, bevor eine Mail zur KI-Auswertung geschickt wird. */
const KEYWORDS = [
  "gamescom",
  "gc26",
  "gc 2026",
  "köln",
  "cologne",
  "termin",
  "meeting",
  "appointment",
  "einladung",
  "invite",
  "invitation",
  "press",
  "presse",
  "preview",
  "hands-on",
  "hands on",
  "briefing",
  "interview",
  "meet to match",
];

const LOOKBACK_DAYS = 30;
const MAX_CANDIDATE_EMAILS = 20;

function buildClient(account: ImapAccountCredentials): ImapFlow {
  return new ImapFlow({
    host: account.host,
    port: account.port,
    secure: account.secure,
    auth: { user: account.username, pass: account.password },
    logger: false,
    // Kurzes Timeout, damit ein Tippfehler im Host nicht bis zu 90s (Standard) blockiert.
    connectionTimeout: 15000,
    greetingTimeout: 15000,
  });
}

export async function testImapConnection(account: ImapAccountCredentials): Promise<void> {
  const client = buildClient(account);
  try {
    await client.connect();
  } catch (error) {
    throw new Error(describeImapError(error, account.host));
  }
  try {
    await client.logout();
  } catch {
    client.close();
  }
}

export async function fetchCandidateEmails(
  account: ImapAccountCredentials,
): Promise<FetchedEmail[]> {
  const client = buildClient(account);

  try {
    await client.connect();
  } catch (error) {
    throw new Error(describeImapError(error, account.host));
  }

  const results: FetchedEmail[] = [];
  try {
    const lock = await client.getMailboxLock("INBOX", { readOnly: true });
    try {
      const since = new Date();
      since.setDate(since.getDate() - LOOKBACK_DAYS);

      const uids = await client.search({ since }, { uid: true });
      if (!uids || uids.length === 0) {
        return [];
      }

      const messages = await client.fetchAll(
        uids.slice(-300),
        { source: true, envelope: true },
        { uid: true },
      );

      for (const message of messages) {
        if (!message.source) continue;

        let parsed;
        try {
          parsed = await simpleParser(message.source);
        } catch {
          continue;
        }

        const subject = parsed.subject || message.envelope?.subject || "";
        const bodyText = (parsed.text || "").slice(0, 5000);
        const haystack = `${subject} ${bodyText}`.toLowerCase();
        if (!KEYWORDS.some((k) => haystack.includes(k))) continue;

        const fromText =
          parsed.from?.text ||
          message.envelope?.from?.map((a) => a.address).filter(Boolean).join(", ") ||
          "";

        results.push({
          uid: message.uid,
          subject,
          from: fromText,
          date: parsed.date || message.envelope?.date || null,
          text: bodyText,
        });
      }
    } finally {
      lock.release();
    }
  } finally {
    try {
      await client.logout();
    } catch {
      client.close();
    }
  }

  return results
    .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0))
    .slice(0, MAX_CANDIDATE_EMAILS);
}

function describeImapError(error: unknown, host: string): string {
  const message = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string } | undefined)?.code;

  if (code === "AUTHENTICATIONFAILED" || /auth/i.test(message)) {
    return "Anmeldung fehlgeschlagen. Bitte Benutzername/Passwort prüfen (bei Gmail/Outlook wird meist ein separates App-Passwort statt des normalen Passworts benötigt).";
  }
  if (code === "ENOTFOUND" || code === "ECONNREFUSED" || code === "ETIMEDOUT") {
    return `Server "${host}" nicht erreichbar. Bitte Host und Port prüfen.`;
  }
  return `IMAP-Verbindung fehlgeschlagen: ${message}`;
}
