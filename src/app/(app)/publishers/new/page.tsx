import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PublisherForm } from "@/components/PublisherForm";

export default async function NewPublisherPage() {
  const teamMembers = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/publishers" className="text-sm text-stone-400">
          ← Zurück
        </Link>
      </div>
      <h1 className="text-lg font-bold text-white">Neuer Publisher-Eintrag</h1>
      <PublisherForm teamMembers={teamMembers} />
    </div>
  );
}
