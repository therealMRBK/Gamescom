/**
 * Pushes appointment changes into assigned team members' own calendars.
 * Two mechanisms, tried in this order per user:
 *
 * 1. CalDAV (if configured) — writes the event directly into their
 *    calendar collection. No invitation/RSVP step exists at this
 *    protocol level, so it shows up already confirmed.
 * 2. SMTP (fallback) — emails a calendar invite (.ics) to their own
 *    mailbox. This *does* show as a pending invitation needing
 *    accept/decline in most calendar apps — email-based iTIP has no
 *    "just add it" concept — but works anywhere IMAP/SMTP works, no
 *    CalDAV support required.
 *
 * Both are best-effort: failures are logged but never block the
 * appointment mutation itself.
 *
 * Known simplification: on update, the event is (re-)pushed to
 * whoever is *currently* assigned. Someone removed from an appointment
 * doesn't get an explicit removal for their own copy — only a full
 * delete of the appointment does.
 */
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { buildCalDavEvent } from "@/lib/ics";
import { deleteCalendarEvent, putCalendarEvent, type CalDavCredentials } from "@/lib/caldav";
import { sendIcsInvite, type SmtpCredentials } from "@/lib/smtp";
import { randomUUID } from "crypto";

type AssigneeWithAccount = {
  id: string;
  name: string;
  email: string;
  imapAccount: {
    username: string;
    encryptedPassword: string;
    caldavUrl: string | null;
    smtpHost: string | null;
    smtpPort: number;
    smtpSecure: boolean;
    calendarPushEnabled: boolean;
  } | null;
};

type PushTarget =
  | { kind: "caldav"; creds: CalDavCredentials }
  | { kind: "smtp"; creds: SmtpCredentials };

function resolveTarget(user: AssigneeWithAccount): PushTarget | null {
  const account = user.imapAccount;
  if (!account || !account.calendarPushEnabled) return null;
  const password = decrypt(account.encryptedPassword);
  if (account.caldavUrl) {
    return { kind: "caldav", creds: { url: account.caldavUrl, username: account.username, password } };
  }
  if (account.smtpHost) {
    return {
      kind: "smtp",
      creds: {
        host: account.smtpHost,
        port: account.smtpPort,
        secure: account.smtpSecure,
        username: account.username,
        password,
      },
    };
  }
  return null;
}

function locationOf(hall: string | null, stand: string | null): string | null {
  const parts = [hall ? `Halle ${hall}` : null, stand ? `Stand ${stand}` : null].filter(Boolean);
  return parts.length ? parts.join(" / ") : null;
}

export async function pushAppointmentUpsert(appointmentId: string): Promise<void> {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      assignments: {
        include: { user: { include: { imapAccount: true } } },
      },
    },
  });
  if (!appt) return;

  const uid = appt.icsUid ?? `${randomUUID()}@gamescom-planner`;
  const sequence = appt.icsUid ? appt.icsSequence + 1 : 0;
  if (!appt.icsUid || sequence !== appt.icsSequence) {
    await prisma.appointment.update({
      where: { id: appt.id },
      data: { icsUid: uid, icsSequence: sequence },
    });
  }

  const location = locationOf(appt.hall, appt.stand);

  await Promise.allSettled(
    appt.assignments.map(async ({ user }) => {
      const target = resolveTarget(user);
      if (!target) return;
      try {
        if (target.kind === "caldav") {
          const ics = buildCalDavEvent({
            uid,
            title: appt.title,
            startTime: appt.startTime,
            endTime: appt.endTime,
            location,
            description: appt.notes,
          });
          await putCalendarEvent(target.creds, uid, ics);
        } else {
          await sendIcsInvite(target.creds, {
            uid,
            sequence,
            method: "REQUEST",
            title: appt.title,
            startTime: appt.startTime,
            endTime: appt.endTime,
            location,
            description: appt.notes,
            organizerEmail: target.creds.username,
            attendeeEmail: user.email,
            attendeeName: user.name,
          });
        }
      } catch (error) {
        console.error(`[calendarPush] Kalender-Push an ${user.email} fehlgeschlagen:`, error);
      }
    }),
  );
}

export async function pushAppointmentDelete(appointmentId: string): Promise<void> {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      assignments: {
        include: { user: { include: { imapAccount: true } } },
      },
    },
  });
  if (!appt || !appt.icsUid) return; // never pushed -> nothing to remove

  const location = locationOf(appt.hall, appt.stand);

  await Promise.allSettled(
    appt.assignments.map(async ({ user }) => {
      const target = resolveTarget(user);
      if (!target) return;
      try {
        if (target.kind === "caldav") {
          await deleteCalendarEvent(target.creds, appt.icsUid!);
        } else {
          await sendIcsInvite(target.creds, {
            uid: appt.icsUid!,
            sequence: appt.icsSequence + 1,
            method: "CANCEL",
            title: appt.title,
            startTime: appt.startTime,
            endTime: appt.endTime,
            location,
            description: appt.notes,
            organizerEmail: target.creds.username,
            attendeeEmail: user.email,
            attendeeName: user.name,
          });
        }
      } catch (error) {
        console.error(`[calendarPush] Kalender-Entfernung für ${user.email} fehlgeschlagen:`, error);
      }
    }),
  );
}
