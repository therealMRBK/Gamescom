import Link from "next/link";
import { requireSession } from "@/lib/rbac";
import { signOut } from "@/auth";

const navItems = [
  { href: "/dashboard", label: "Heute", icon: "🏠" },
  { href: "/publishers", label: "Publisher", icon: "🏢" },
  { href: "/calendar", label: "Kalender", icon: "📅" },
  { href: "/team", label: "Team", icon: "👥" },
  { href: "/content", label: "Content", icon: "🎬" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="no-print sticky top-0 z-20 flex items-center justify-between border-b border-stone-800 bg-stone-950/95 px-4 py-3 backdrop-blur">
        <div>
          <p className="font-console text-[11px] font-semibold tracking-wide text-amber-500">
            COMMAND CENTER
          </p>
          <p className="text-sm text-stone-300">
            {session.user.name}{" "}
            <span className="text-stone-500">
              · {session.user.role === "ADMIN" ? "Admin" : "Redakteur:in"}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/hallplan"
            className="rounded-lg px-2.5 py-2 text-sm text-stone-400 hover:bg-stone-800"
          >
            🗺️
          </Link>
          <Link
            href="/settings"
            className="rounded-lg px-2.5 py-2 text-sm text-stone-400 hover:bg-stone-800"
          >
            📬
          </Link>
          {session.user.role === "ADMIN" && (
            <Link
              href="/admin/users"
              className="rounded-lg px-2.5 py-2 text-sm text-stone-400 hover:bg-stone-800"
            >
              ⚙️
            </Link>
          )}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="rounded-lg px-3 py-2 text-sm text-stone-400 hover:bg-stone-800">
              Abmelden
            </button>
          </form>
        </div>
      </header>

      <main className="no-print flex-1 px-4 pb-24 pt-4">{children}</main>

      <nav className="no-print fixed bottom-0 left-0 right-0 z-20 grid grid-cols-5 border-t border-stone-800 bg-stone-950/95 backdrop-blur">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-0.5 py-2.5 text-[11px] text-stone-400 active:bg-stone-800"
          >
            <span className="text-lg leading-none">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
