import nodemailer from "nodemailer";
import { buildIcsInvite, type IcsEventInput } from "@/lib/ics";

export type SmtpCredentials = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
};

function buildTransport(account: SmtpCredentials) {
  return nodemailer.createTransport({
    host: account.host,
    port: account.port,
    secure: account.secure,
    auth: { user: account.username, pass: account.password },
  });
}

export async function testSmtpConnection(account: SmtpCredentials): Promise<void> {
  const transport = buildTransport(account);
  try {
    await transport.verify();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`SMTP-Verbindung zu ${account.host}:${account.port} fehlgeschlagen: ${message}`);
  }
}

export async function sendIcsInvite(
  account: SmtpCredentials,
  event: IcsEventInput,
): Promise<void> {
  const transport = buildTransport(account);
  const ics = buildIcsInvite(event);
  const isCancel = event.method === "CANCEL";

  await transport.sendMail({
    from: `"Gamescom Command Center" <${account.username}>`,
    to: event.attendeeEmail,
    subject: isCancel
      ? `Abgesagt: ${event.title}`
      : `Termin: ${event.title}`,
    text: isCancel
      ? `Der Termin "${event.title}" wurde abgesagt/entfernt.`
      : `Termin: ${event.title}\n${event.startTime.toLocaleString("de-DE")} – ${event.endTime.toLocaleString("de-DE")}${event.location ? `\nOrt: ${event.location}` : ""}`,
    icalEvent: {
      method: event.method,
      content: ics,
    },
  });
}
