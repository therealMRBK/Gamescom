import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { UserForm } from "@/components/UserForm";
import { DeleteButton } from "@/components/DeleteButton";
import { deleteUser } from "@/lib/actions/users";
import { FOCUS_AREA_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await requireAdmin();

  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold text-white">Teammitglieder verwalten</h1>

      <section className="space-y-2">
        {users.map((u) => (
          <div
            key={u.id}
            className="flex items-center justify-between rounded-xl bg-slate-900 p-3 ring-1 ring-slate-800"
          >
            <div>
              <p className="text-sm font-semibold text-white">
                {u.name} <span className="text-slate-500">({u.email})</span>
              </p>
              <p className="text-xs text-slate-400">
                {u.role === "ADMIN" ? "Admin" : "Redakteur:in"}
                {u.focusArea ? ` · ${FOCUS_AREA_LABELS[u.focusArea]}` : ""}
              </p>
            </div>
            {u.id !== session.user.id && (
              <DeleteButton
                action={deleteUser.bind(null, u.id)}
                confirmText={`"${u.name}" wirklich entfernen? Zuweisungen bleiben als Historie erhalten.`}
                label="Entfernen"
              />
            )}
          </div>
        ))}
      </section>

      <section className="rounded-xl bg-slate-900 p-4 ring-1 ring-slate-800">
        <h2 className="mb-3 text-sm font-semibold text-slate-300">Neues Teammitglied</h2>
        <UserForm />
      </section>
    </div>
  );
}
