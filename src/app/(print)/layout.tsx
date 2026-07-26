import { requireSession } from "@/lib/rbac";

export default async function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession();
  return <div className="min-h-dvh bg-white text-stone-900">{children}</div>;
}
