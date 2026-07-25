"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createUser } from "@/lib/actions/users";
import { FOCUS_AREA_LABELS } from "@/lib/constants";

const COLORS = ["#6366f1", "#f97316", "#10b981", "#ec4899", "#0ea5e9", "#eab308"];

export function UserForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      action={(formData: FormData) => {
        startTransition(async () => {
          await createUser({
            name: String(formData.get("name") || ""),
            email: String(formData.get("email") || ""),
            password: String(formData.get("password") || ""),
            role: formData.get("role") as "ADMIN" | "EDITOR",
            focusArea: (formData.get("focusArea") as "VIDEO" | "ARTIKEL" | "SOCIAL") || null,
            color: String(formData.get("color") || COLORS[0]),
          });
          router.refresh();
        });
      }}
    >
      <label className="block">
        <span className="mb-1 block text-sm text-slate-300">Name</span>
        <input name="name" required className="input" />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-slate-300">E-Mail</span>
        <input name="email" type="email" required className="input" />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-slate-300">Passwort</span>
        <input name="password" type="password" required minLength={8} className="input" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-sm text-slate-300">Rolle</span>
          <select name="role" defaultValue="EDITOR" className="input">
            <option value="EDITOR">Redakteur:in</option>
            <option value="ADMIN">Admin</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-slate-300">Schwerpunkt</span>
          <select name="focusArea" defaultValue="" className="input">
            <option value="">–</option>
            {Object.entries(FOCUS_AREA_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div>
        <span className="mb-1 block text-sm text-slate-300">Farbe (Kalender)</span>
        <div className="flex gap-2">
          {COLORS.map((c) => (
            <label key={c}>
              <input
                type="radio"
                name="color"
                value={c}
                defaultChecked={c === COLORS[0]}
                className="peer sr-only"
              />
              <span
                className="block h-8 w-8 rounded-full ring-2 ring-transparent peer-checked:ring-white"
                style={{ backgroundColor: c }}
              />
            </label>
          ))}
        </div>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-base font-semibold text-white active:scale-[0.98] disabled:opacity-60"
      >
        {isPending ? "Legt an…" : "Teammitglied anlegen"}
      </button>
    </form>
  );
}
