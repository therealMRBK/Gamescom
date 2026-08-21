"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/rbac";
import { encrypt, decrypt } from "@/lib/crypto";
import { searchInboxUids, fetchEmailsByUid, matchesKeywords, testImapConnection } from "@/lib/imap";
import { testSmtpConnection } from "@/lib/smtp";
import { extractInvitationFromEmail } from "@/lib/ai";
import { revalidatePath } from "next/cache";
import { toActionResult, type ActionResult } from "@/lib/actionResult";

export type ImapAccountInput = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  calendarPushEnabled: boolean;
};

export async function getImapAccountStatus() {
  const session = await requireSession();
  return prisma.imapAccount.findUnique({
    where: { userId: session.user.id },
    select: {
      host: true,
      port: true,
      secure: true,
      username: true,
      smtpHost: true,
      smtpPort: true,
      smtpSecure: true,
      calendarPushEnabled: true,
      updatedAt: true,
    },
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

    // SMTP ist optional -- wer nur die Posteingangs-Suche nutzen will, kann
    // das Feld leer lassen und bekommt keinen Kalender-Push.
    if (input.smtpHost) {
      await testSmtpConnection({
        host: input.smtpHost,
        port: input.smtpPort,
        secure: input.smtpSecure,
        username: input.username,
        password: input.password,
      });
    }

    const encryptedPassword = encrypt(input.password);
    const smtpFields = {
      smtpHost: input.smtpHost || null,
      smtpPort: input.smtpPort,
      smtpSecure: input.smtpSecure,
      calendarPushEnabled: input.calendarPushEnabled,
    };

    await prisma.imapAccount.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        host: input.host,
        port: input.port,
        secure: input.secure,
        username: input.username,
        encryptedPassword,
        ...smtpFields,
      },
      update: {
        host: input.host,
        port: input.port,
        secure: input.secure,
        username: input.username,
        encryptedPassword,
        ...smtpFields,
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

export type ScanResult = {
  candidates: InvitationCandidate[];
  totalInRange: number;
  newlyChecked: number;
};

export async function scanImapInbox(): Promise<ActionResult<ScanResult>> {
  const session = await requireSession();

  return toActionResult(async () => {
    const account = await prisma.imapAccount.findUnique({ where: { userId: session.user.id } });
    if (!account) {
      throw new Error("Kein Postfach verbunden. Bitte zuerst in den Einstellungen einrichten.");
    }

    const password = decrypt(account.encryptedPassword);
    const credentials = {
      host: account.host,
      port: account.port,
      secure: account.secure,
      username: account.username,
      password,
    };

    const uids = await searchInboxUids(credentials);

    const cachedRows = await prisma.scannedEmail.findMany({
      where: { imapAccountId: account.id, uid: { in: uids } },
      select: { uid: true },
    });
    const cachedUidSet = new Set(cachedRows.map((r) => r.uid));
    const newUids = uids.filter((u) => !cachedUidSet.has(u));

    const newEmails = newUids.length > 0 ? await fetchEmailsByUid(credentials, newUids) : [];

    let lastError: Error | null = null;
    let checkedCount = 0;

    const publisherNamesForPrompt = (
      await prisma.publisherEntry.findMany({ select: { publisher: true } })
    ).map((p) => p.publisher);

    for (const email of newEmails) {
      const worthChecking = matchesKeywords(email.subject, email.text);

      if (!worthChecking) {
        await prisma.scannedEmail.upsert({
          where: { imapAccountId_uid: { imapAccountId: account.id, uid: email.uid } },
          create: {
            imapAccountId: account.id,
            uid: email.uid,
            subject: email.subject,
            fromAddress: email.from,
            emailDate: email.date,
            textSnippet: "",
            isRelevant: false,
          },
          update: {},
        });
        continue;
      }

      checkedCount++;
      let extracted;
      try {
        extracted = await extractInvitationFromEmail({
          subject: email.subject,
          from: email.from,
          date: email.date ? email.date.toISOString() : null,
          text: email.text,
          knownPublishers: publisherNamesForPrompt,
        });
      } catch (e) {
        // Nicht cachen - beim nächsten Scan erneut versuchen (z.B. bei temporärem KI-Fehler).
        lastError = e instanceof Error ? e : new Error(String(e));
        continue;
      }

      await prisma.scannedEmail.upsert({
        where: { imapAccountId_uid: { imapAccountId: account.id, uid: email.uid } },
        create: {
          imapAccountId: account.id,
          uid: email.uid,
          subject: email.subject,
          fromAddress: email.from,
          emailDate: email.date,
          textSnippet: email.text.slice(0, 3000),
          isRelevant: extracted.isRelevant,
          summary: extracted.summary || null,
          publisherGuess: extracted.publisherGuess,
          proposedDate: extracted.proposedDate,
          proposedTime: extracted.proposedTime,
          location: extracted.location,
        },
        update: {
          isRelevant: extracted.isRelevant,
          summary: extracted.summary || null,
          publisherGuess: extracted.publisherGuess,
          proposedDate: extracted.proposedDate,
          proposedTime: extracted.proposedTime,
          location: extracted.location,
        },
      });
    }

    const relevantRows = await prisma.scannedEmail.findMany({
      where: { imapAccountId: account.id, uid: { in: uids }, isRelevant: true },
      orderBy: { emailDate: "desc" },
    });

    if (relevantRows.length === 0 && lastError && checkedCount > 0) {
      throw lastError;
    }

    const publishers = await prisma.publisherEntry.findMany({
      select: { id: true, publisher: true },
    });

    const candidates: InvitationCandidate[] = relevantRows.map((row) => {
      const matched = row.publisherGuess
        ? publishers.find((p) => p.publisher.toLowerCase() === row.publisherGuess!.toLowerCase())
        : undefined;
      return {
        uid: row.uid,
        subject: row.subject,
        from: row.fromAddress,
        date: row.emailDate ? row.emailDate.toISOString() : null,
        text: row.textSnippet,
        summary: row.summary || "",
        publisherGuess: row.publisherGuess,
        matchedPublisherId: matched?.id || null,
        proposedDate: row.proposedDate,
        proposedTime: row.proposedTime,
        location: row.location,
      };
    });

    return {
      candidates,
      totalInRange: uids.length,
      newlyChecked: checkedCount,
    };
  });
}
