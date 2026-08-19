"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveImapAccount, deleteImapAccount } from "@/lib/actions/imap";

type AccountStatus = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  updatedAt: Date;
} | null;

export function ImapAccountForm({ account }: { account: AccountStatus }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  return (
    <section className="rounded-xl bg-stone-900 p-4 ring-1 ring-stone-800">
      <h2 className="mb-1 text-sm font-semibold text-stone-300">IMAP-Postfach</h2>
      <p className="mb-3 text-xs text-stone-500">
        Wird nur verwendet, um auf Knopfdruck nach gamescom-Einladungen zu suchen – keine
        automatische Synchronisierung im Hintergrund. Das Passwort wird verschlüsselt
        gespeichert und nie wieder angezeigt.
      </p>

      {account && (
        <p className="mb-3 text-xs text-stone-400">
          Verbunden: <span className="text-stone-200">{account.username}</span> ·{" "}
          {account.host}:{account.port} ({account.secure ? "TLS" : "unverschlüsselt"})
        </p>
      )}

      <form
        className="space-y-3"
        action={(formData: FormData) => {
          setError(null);
          setSuccess(null);
          const input = {
            host: String(formData.get("host") || ""),
            port: Number(formData.get("port") || 993),
            secure: formData.get("secure") === "on",
            username: String(formData.get("username") || ""),
            password: String(formData.get("password") || ""),
          };
          startTransition(async () => {
            const result = await saveImapAccount(input);
            if (result.ok) {
              setSuccess("Postfach verbunden.");
              router.refresh();
            } else {
              setError(result.error);
            }
          });
        }}
      >
        <label className="block">
          <span className="mb-1 block text-sm text-stone-300">IMAP-Server</span>
          <input
            name="host"
            required
            defaultValue={account?.host || ""}
            placeholder="imap.example.com"
            className="input"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm text-stone-300">Port</span>
            <input
              name="port"
              type="number"
              required
              defaultValue={account?.port ?? 993}
              className="input"
            />
          </label>
          <label className="flex items-end gap-2 pb-2.5">
            <input
              type="checkbox"
              name="secure"
              defaultChecked={account?.secure ?? true}
              className="h-4 w-4"
            />
            <span className="text-sm text-stone-300">TLS/SSL</span>
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm text-stone-300">Benutzername (meist die E-Mail-Adresse)</span>
          <input
            name="username"
            required
            defaultValue={account?.username || ""}
            className="input"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-stone-300">
            Passwort{account ? " (zum Aktualisieren erneut eingeben)" : ""}
          </span>
          <input name="password" type="password" required className="input" />
        </label>

        {error && <p className="text-xs text-red-400">{error}</p>}
        {success && <p className="text-xs text-emerald-400">{success}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 rounded-xl bg-amber-700 px-4 py-3 text-base font-semibold text-white active:scale-[0.98] disabled:opacity-60"
          >
            {isPending ? "Prüft Verbindung…" : "Verbindung speichern"}
          </button>
          {account && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setError(null);
                setSuccess(null);
                startTransition(async () => {
                  try {
                    await deleteImapAccount();
                    router.refresh();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Trennen fehlgeschlagen.");
                  }
                });
              }}
              className="rounded-xl bg-stone-800 px-4 py-3 text-sm text-stone-300 active:scale-[0.98] disabled:opacity-60"
            >
              Trennen
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
