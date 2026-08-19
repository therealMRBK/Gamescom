"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { scanImapInbox, type InvitationCandidate } from "@/lib/actions/imap";
import { draftReplyToInvitation } from "@/lib/actions/ai";
import { EVENT_DAYS } from "@/lib/constants";

export function InboxScanner({ hasAccount }: { hasAccount: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [candidates, setCandidates] = useState<InvitationCandidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [replyErrors, setReplyErrors] = useState<Record<number, string>>({});
  const [draftingUid, setDraftingUid] = useState<number | null>(null);

  function scan() {
    setError(null);
    startTransition(async () => {
      const result = await scanImapInbox();
      if (result.ok) {
        setCandidates(result.value);
      } else {
        setError(result.error);
      }
    });
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
          Publishern und schlägt jeweils Termin und Antwort vor. Nichts wird automatisch
          angelegt oder verschickt.
        </p>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

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
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => draftReply(c)}
                  className="rounded-lg bg-stone-800 px-2.5 py-1.5 text-xs text-amber-400 disabled:opacity-50"
                >
                  {draftingUid === c.uid ? "Entwirft…" : "✨ Antwort entwerfen"}
                </button>
              </div>

              {replyErrors[c.uid] && (
                <p className="mt-1 text-xs text-red-400">{replyErrors[c.uid]}</p>
              )}
              {replyDrafts[c.uid] && (
                <textarea
                  readOnly
                  value={replyDrafts[c.uid]}
                  rows={8}
                  className="input mt-2 text-sm"
                  onFocus={(e) => e.target.select()}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
