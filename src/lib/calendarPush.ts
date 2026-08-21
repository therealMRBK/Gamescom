/**
 * Pushes appointment changes into assigned team members' own calendars,
 * via a calendar invite (.ics) emailed through their connected mailbox's
 * SMTP settings (see settings page). This is a best-effort side effect:
 * failures here are logged but never block the appointment mutation
 * itself — e.g. a stale SMTP password shouldn't make it impossible to
 * edit a appointment.
 *
 * Known simplification: on update, invites are (re-)sent to whoever is
 * *currently* assigned. Someone removed from an appointment doesn't get
 * an explicit cancel for their own copy — only a full delete does.
 */
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { sendIcsInvite, type SmtpCredentials } from "@/lib/smtp";
import { randomUUID } from "crypto";

type AssigneeWithAccount = {
  id: string;
  name: string;
  email: string;
  imapAccount: {
    username: string;
    encryptedPassword: string;
    smtpHost: string | null;
    smtpPort: number;
    smtpSecure: boolean;
    calendarPushEnabled: boolean;
  } | null;
};

function toCredentials(user: AssigneeWithAccount): SmtpCredentials | null {
  const account = user.imapAccount;
  if (!account || !account.calendarPushEnabled || !account.smtpHost) return null;
  return {
    host: account.smtpHost,
    port: account.smtpPort,
    secure: account.smtpSecure,
    username: account.username,
    password: decrypt(account.encryptedPassword),
  };
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
      const credentials = toCredentials(user);
      if (!credentials) return;
      try {
        await sendIcsInvite(credentials, {
          uid,
          sequence,
          method: "REQUEST",
          title: appt.title,
          startTime: appt.startTime,
          endTime: appt.endTime,
          location,
          description: appt.notes,
          organizerEmail: credentials.username,
          attendeeEmail: user.email,
          attendeeName: user.name,
        });
      } catch (error) {
        console.error(`[calendarPush] Kalender-Invite an ${user.email} fehlgeschlagen:`, error);
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
  if (!appt || !appt.icsUid) return; // never pushed -> nothing to cancel

  const location = locationOf(appt.hall, appt.stand);

  await Promise.allSettled(
    appt.assignments.map(async ({ user }) => {
      const credentials = toCredentials(user);
      if (!credentials) return;
      try {
        await sendIcsInvite(credentials, {
          uid: appt.icsUid!,
          sequence: appt.icsSequence + 1,
          method: "CANCEL",
          title: appt.title,
          startTime: appt.startTime,
          endTime: appt.endTime,
          location,
          description: appt.notes,
          organizerEmail: credentials.username,
          attendeeEmail: user.email,
          attendeeName: user.name,
        });
      } catch (error) {
        console.error(`[calendarPush] Kalender-Absage an ${user.email} fehlgeschlagen:`, error);
      }
    }),
  );
}
