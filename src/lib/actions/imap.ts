"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/rbac";
import { encrypt, decrypt } from "@/lib/crypto";
import { fetchCandidateEmails, testImapConnection } from "@/lib/imap";
import { extractInvitationFromEmail } from "@/lib/ai";
import { revalidatePath } from "next/cache";
import { toActionResult, type ActionResult } from "@/lib/actionResult";

export type ImapAccountInput = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
};

export async function getImapAccountStatus() {
  const session = await requireSession();
  return prisma.imapAccount.findUnique({
    where: { userId: session.user.id },
    select: { host: true, port: true, secure: true, username: true, updatedAt: true },
  });
}

export async function saveImapAccount(input: ImapAccountInput): Promise<ActionResult<true>> {
  const session = await requireSession();

  return toActionResult(async () => {
    // Verbindung sofort testen, damit Tippfehler nicht erst beim ersten Sync auffallen.
    await testImapConnection({
      host: input.host,
      port: input.port,
      secure: input.secure,
      username: input.username,
      password: input.password,
    });

    const encryptedPassword = encrypt(input.password);

    await prisma.imapAccount.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        host: input.host,
        port: input.port,
        secure: input.secure,
        username: input.username,
        encryptedPassword,
      },
      update: {
        host: input.host,
        port: input.port,
        secure: input.secure,
        username: input.username,
        encryptedPassword,
      },
    });

    revalidatePath("/settings");
    return true as const;
  });
}

export async function deleteImapAccount() {
  const session = await requireSession();
  await prisma.imapAccount.deleteMany({ where: { userId: session.user.id } });
  revalidatePath("/settings");
}

export type InvitationCandidate = {
  uid: number;
  subject: string;
  from: string;
  date: string | null;
  text: string;
  summary: string;
  publisherGuess: string | null;
  matchedPublisherId: string | null;
  proposedDate: string | null;
  proposedTime: string | null;
  location: string | null;
};

export async function scanImapInbox(): Promise<ActionResult<InvitationCandidate[]>> {
  const session = await requireSession();

  return toActionResult(async () => {
    const account = await prisma.imapAccount.findUnique({ where: { userId: session.user.id } });
    if (!account) {
      throw new Error("Kein Postfach verbunden. Bitte zuerst in den Einstellungen einrichten.");
    }

    const password = decrypt(account.encryptedPassword);
    const emails = await fetchCandidateEmails({
      host: account.host,
      port: account.port,
      secure: account.secure,
      username: account.username,
      password,
    });

    if (emails.length === 0) return [];

    const publishers = await prisma.publisherEntry.findMany({
      select: { id: true, publisher: true },
    });
    const publisherNames = publishers.map((p) => p.publisher);

    const candidates: InvitationCandidate[] = [];
    let lastError: Error | null = null;

    for (const email of emails) {
      let extracted;
      try {
        extracted = await extractInvitationFromEmail({
          subject: email.subject,
          from: email.from,
          date: email.date ? email.date.toISOString() : null,
          text: email.text,
          knownPublishers: publisherNames,
        });
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        continue;
      }

      if (!extracted.isRelevant) continue;

      const matched = extracted.publisherGuess
        ? publishers.find(
            (p) => p.publisher.toLowerCase() === extracted.publisherGuess!.toLowerCase(),
          )
        : undefined;

      candidates.push({
        uid: email.uid,
        subject: email.subject,
        from: email.from,
        date: email.date ? email.date.toISOString() : null,
        text: email.text.slice(0, 3000),
        summary: extracted.summary,
        publisherGuess: extracted.publisherGuess,
        matchedPublisherId: matched?.id || null,
        proposedDate: extracted.proposedDate,
        proposedTime: extracted.proposedTime,
        location: extracted.location,
      });
    }

    // Wenn wirklich jede einzelne Auswertung fehlgeschlagen ist (z.B. ungültiger API-Key),
    // den Fehler durchreichen statt eine irreführende "keine Treffer"-Liste zu zeigen.
    if (candidates.length === 0 && lastError && emails.length > 0) {
      throw lastError;
    }

    return candidates;
  });
}
