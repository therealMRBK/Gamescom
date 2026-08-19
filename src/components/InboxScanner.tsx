"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { scanImapInbox, type InvitationCandidate } from "@/lib/actions/imap";
import { draftReplyToInvitation } from "@/lib/actions/ai";
import { EVENT_DAYS } from "@/lib/constants";

function defaultInstruction(publisher: string | null): string {
  return `Beantworte die folgende eingehende E-Mail${publisher ? ` von ${publisher}` : ""} freundlich und bestätige grundsätzliches Interesse an einem Termin, ohne dich auf einen konkreten Slot festzulegen (das übernimmt das Team manuell nach Abgleich mit dem eigenen Zeitplan).`;
}

export function InboxScanner({ hasAccount }: { hasAccount: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [candidates, setCandidates] = useState<InvitationCandidate[] | null>(null);
  const [scanMeta, setScanMeta] = useState<{ totalInRange: number; newlyChecked: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [replyErrors, setReplyErrors] = useState<Record<number, string>>({});
  const [promptTexts, setPromptTexts] = useState<Record<number, string>>({});
  const [draftingUid, setDraftingUid] = useState<number | null>(null);

  function scan() {
    setError(null);
    startTransition(async () => {
      const result = await scanImapInbox();
      if (result.ok) {
        setCandidates(result.value.candidates);
        setScanMeta({
          totalInRange: result.value.totalInRange,
          newlyChecked: result.value.newlyChecked,
        });
      } else {
        setError(result.error);
      }
    });
  }

  function promptFor(c: InvitationCandidate): string {
    return promptTexts[c.uid] ?? defaultInstruction(c.publisherGuess);
  }

  function draftReply(candidate: InvitationCandidate) {
    setDraftingUid(candidate.uid);
    setReplyErrors((prev) => ({ ...prev, [candidate.uid]: "" }));
    startTransition(async () => {
      const result = await draftReplyToInvitation({
        subject: candidate.subject,
        from: candidate.from,
        emailText: candidate.text,
        publisher: candidate.publisherGuess,
        customInstructions: promptFor(candidate),
      });
      if (result.ok) {
        setReplyDrafts((prev) => ({ ...prev, [candidate.uid]: result.value }));
      } else {
        setReplyErrors((prev) => ({ ...prev, [candidate.uid]: result.error }));
      }
      setDraftingUid(null);
    });
  }

  function appointmentHref(candidate: InvitationCandidate): string {
    const params = new URLSearchParams();
    if (candidate.proposedDate && EVENT_DAYS.some((d) => d.date === candidate.proposedDate)) {
      params.set("day", candidate.proposedDate);
    }
    params.set(
      "title",
      candidate.publisherGuess ? `Termin ${candidate.publisherGuess}` : candidate.subject,
    );
    if (candidate.matchedPublisherId) {
      params.set("publisherEntryId", candidate.matchedPublisherId);
    }
    if (candidate.proposedTime && /^\d{2}:\d{2}$/.test(candidate.proposedTime)) {
      params.set("time", candidate.proposedTime);
    }
    return `/calendar/new?${params.toString()}`;
  }

  return (
    <section className="rounded-xl bg-stone-900 p-4 ring-1 ring-stone-800">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-stone-300">Postfach durchsuchen (KI)</h2>
        <button
          type="button"
          disabled={isPending || !hasAccount}
          onClick={scan}
          className="rounded-lg bg-stone-800 px-2 py-1 text-xs text-amber-400 disabled:opacity-50"
        >
          {isPending && draftingUid === null ? "Durchsucht…" : "✨ Postfach durchsuchen"}
        </button>
      </div>

      {!hasAccount && (
        <p className="text-xs text-stone-500">
          Bitte zuerst oben ein Postfach verbinden, um nach Einladungen zu suchen.
        </p>
      )}

      {hasAccount && !candidates && !error && (
        <p className="text-xs text-stone-500">
          Durchsucht die letzten 30 Tage nach möglichen Termin-/Presseeinladungen von
          Publishern und schlägt jeweils Termin und Antwort vor. Bereits geprüfte Mails
          werden zwischengespeichert und bei erneutem Durchsuchen übersprungen. Nichts wird
          automatisch angelegt oder verschickt.
        </p>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      {scanMeta && (
        <p className="mb-2 text-[11px] text-stone-500">
          {scanMeta.totalInRange} Mails im Zeitraum, {scanMeta.newlyChecked} davon neu geprüft
          (Rest aus dem Cache).
        </p>
      )}

      {candidates && candidates.length === 0 && !error && (
        <p className="text-xs text-stone-500">Keine passenden Einladungen gefunden.</p>
      )}

      {candidates && candidates.length > 0 && (
        <ul className="mt-2 space-y-3">
          {candidates.map((c) => (
            <li key={c.uid} className="rounded-lg bg-stone-950/60 p-3 ring-1 ring-stone-800">
              <p className="text-sm font-semibold text-white">{c.subject}</p>
              <p className="text-xs text-stone-500">
                {c.from}
                {c.date ? ` · ${new Date(c.date).toLocaleDateString("de-DE")}` : ""}
              </p>
              {c.summary && <p className="mt-1 text-sm text-stone-300">{c.summary}</p>}
              <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-stone-400">
                {c.publisherGuess && (
                  <span className="rounded-full bg-stone-800 px-2 py-0.5">
                    {c.publisherGuess}
                    {c.matchedPublisherId ? " · in Liste" : ""}
                  </span>
                )}
                {c.proposedDate && (
                  <span className="rounded-full bg-stone-800 px-2 py-0.5">
                    {c.proposedDate}
                    {c.proposedTime ? ` ${c.proposedTime}` : ""}
                  </span>
                )}
                {c.location && (
                  <span className="rounded-full bg-stone-800 px-2 py-0.5">{c.location}</span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <Link
                  href={appointmentHref(c)}
                  className="rounded-lg bg-amber-700 px-2.5 py-1.5 text-xs font-semibold text-white"
                >
                  Termin anlegen
                </Link>
              </div>

              <label className="mt-2 block">
                <span className="mb-1 block text-[11px] text-stone-500">
                  Anweisung an die KI für die Antwort (bearbeitbar)
                </span>
                <textarea
                  value={promptFor(c)}
                  onChange={(e) =>
                    setPromptTexts((prev) => ({ ...prev, [c.uid]: e.target.value }))
                  }
                  rows={3}
                  className="input text-xs"
                />
              </label>
              <button
                type="button"
                disabled={isPending}
                onClick={() => draftReply(c)}
                className="mt-2 rounded-lg bg-stone-800 px-2.5 py-1.5 text-xs text-amber-400 disabled:opacity-50"
              >
                {draftingUid === c.uid ? "Entwirft…" : "✨ Antwort entwerfen"}
              </button>

              {replyErrors[c.uid] && (
                <p className="mt-1 text-xs text-red-400">{replyErrors[c.uid]}</p>
              )}
              {replyDrafts[c.uid] !== undefined && (
                <label className="mt-2 block">
                  <span className="mb-1 block text-[11px] text-stone-500">
                    Antwort-Entwurf (bearbeitbar)
                  </span>
                  <textarea
                    value={replyDrafts[c.uid]}
                    onChange={(e) =>
                      setReplyDrafts((prev) => ({ ...prev, [c.uid]: e.target.value }))
                    }
                    rows={8}
                    className="input text-sm"
                  />
                </label>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
