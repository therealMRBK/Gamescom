/**
 * Minimal CalDAV client — just enough to PUT/DELETE a single event
 * object in an already-known calendar collection. No discovery: the
 * user pastes their calendar collection URL directly (most providers
 * with manual IMAP setup — iCloud, Fastmail, Nextcloud, self-hosted
 * Radicale/Baïkal — show this in their account settings), same
 * pattern as the existing manual IMAP/SMTP host fields.
 *
 * This writes the event directly into the calendar store, unlike the
 * SMTP/.ics-invite path — there's no iTIP scheduling/RSVP concept at
 * this protocol level, so it shows up already confirmed.
 */

export type CalDavCredentials = {
  url: string; // calendar collection URL, e.g. https://host/dav/calendars/user/me/Default/
  username: string;
  password: string;
};

function authHeader(username: string, password: string): string {
  return "Basic " + Buffer.from(`${username}:${password}`).toString("base64");
}

function eventUrl(collectionUrl: string, uid: string): string {
  const base = collectionUrl.endsWith("/") ? collectionUrl : `${collectionUrl}/`;
  return `${base}${uid}.ics`;
}

export async function testCalDavConnection(creds: CalDavCredentials): Promise<void> {
  let res: Response;
  try {
    res = await fetch(creds.url, {
      method: "PROPFIND",
      headers: {
        Authorization: authHeader(creds.username, creds.password),
        Depth: "0",
        "Content-Type": "application/xml; charset=utf-8",
      },
      body: '<?xml version="1.0" encoding="utf-8" ?><D:propfind xmlns:D="DAV:"><D:prop><D:displayname/></D:prop></D:propfind>',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`CalDAV-Server nicht erreichbar: ${message}`);
  }
  // 207 Multi-Status is the expected success response for PROPFIND;
  // some servers also accept a plain 200.
  if (res.status !== 207 && res.status !== 200) {
    throw new Error(
      `CalDAV-Verbindung fehlgeschlagen: HTTP ${res.status} ${res.statusText}. ` +
        `Prüfe die Kalender-URL und ob Benutzername/Passwort für CalDAV gelten.`,
    );
  }
}

export async function putCalendarEvent(
  creds: CalDavCredentials,
  uid: string,
  icsContent: string,
): Promise<void> {
  const res = await fetch(eventUrl(creds.url, uid), {
    method: "PUT",
    headers: {
      Authorization: authHeader(creds.username, creds.password),
      "Content-Type": "text/calendar; charset=utf-8",
    },
    body: icsContent,
  });
  if (!res.ok) {
    throw new Error(`CalDAV-Termin konnte nicht gespeichert werden: HTTP ${res.status} ${res.statusText}`);
  }
}

export async function deleteCalendarEvent(creds: CalDavCredentials, uid: string): Promise<void> {
  const res = await fetch(eventUrl(creds.url, uid), {
    method: "DELETE",
    headers: { Authorization: authHeader(creds.username, creds.password) },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`CalDAV-Termin konnte nicht gelöscht werden: HTTP ${res.status} ${res.statusText}`);
  }
}
