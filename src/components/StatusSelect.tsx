"use client";

import { useTransition } from "react";
import { updateContactStatus } from "@/lib/actions/publishers";
import { CONTACT_STATUS_LABELS } from "@/lib/constants";
import type { ContactStatus } from "@prisma/client";

export function StatusSelect({
  entryId,
  status,
}: {
  entryId: string;
  status: ContactStatus;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={isPending}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        e.stopPropagation();
        const newStatus = e.target.value as ContactStatus;
        startTransition(() => updateContactStatus(entryId, newStatus));
      }}
      className="rounded-lg border border-stone-700 bg-stone-800 px-2 py-1.5 text-xs text-stone-200 disabled:opacity-50"
    >
      {Object.entries(CONTACT_STATUS_LABELS).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
