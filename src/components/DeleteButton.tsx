"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function DeleteButton({
  action,
  confirmText,
  redirectTo,
  label = "Löschen",
}: {
  action: () => Promise<void>;
  confirmText: string;
  redirectTo?: string;
  label?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!confirm(confirmText)) return;
        startTransition(async () => {
          await action();
          if (redirectTo) router.push(redirectTo);
          else router.refresh();
        });
      }}
      className="rounded-xl border border-red-900 bg-red-950/50 px-4 py-3 text-sm font-medium text-red-300 active:scale-[0.98] disabled:opacity-50"
    >
      {isPending ? "…" : label}
    </button>
  );
}
