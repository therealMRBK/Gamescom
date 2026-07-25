import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { FOCUS_AREA_LABELS } from "@/lib/constants";
import { berlinTodayKey } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const todayKey = berlinTodayKey();

  const members = await prisma.user.findMany({
    orderBy: { name: "asc" },
    include: {
      availabilities: { where: { day: new Date(`${todayKey}T00:00:00.000Z`) } },
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-white">Team</h1>

      <ul className="space-y-2">
        {members.map((member) => {
          const today = member.availabilities[0];
          return (
            <li key={member.id}>
              <Link
                href={`/team/${member.id}`}
                className="flex items-center justify-between rounded-xl bg-slate-900 p-3 ring-1 ring-slate-800 active:bg-slate-800"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white"
                    style={{ backgroundColor: member.color }}
                  >
                    {member.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{member.name}</p>
                    <p className="text-xs text-slate-400">
                      {member.role === "ADMIN" ? "Admin" : "Redakteur:in"}
                      {member.focusArea ? ` · ${FOCUS_AREA_LABELS[member.focusArea]}` : ""}
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-[11px] font-medium ${
                    today?.onSite
                      ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                      : "bg-slate-500/15 text-slate-400 ring-1 ring-slate-500/30"
                  }`}
                >
                  {today?.onSite ? "Heute vor Ort" : "Heute nicht vor Ort"}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
