import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AppointmentForm } from "@/components/AppointmentForm";
import { EVENT_DAYS } from "@/lib/constants";

export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<{
    day?: string;
    title?: string;
    publisherEntryId?: string;
    time?: string;
  }>;
}) {
  const { day, title, publisherEntryId, time } = await searchParams;
  const backDay = day || EVENT_DAYS[0].date;

  const [publishers, teamMembers] = await Promise.all([
    prisma.publisherEntry.findMany({
      orderBy: { publisher: "asc" },
      select: { id: true, publisher: true },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-4">
      <Link href={`/calendar?view=day&day=${backDay}`} className="text-sm text-stone-400">
        ← Zurück
      </Link>
      <h1 className="text-lg font-bold text-white">Neuer Termin</h1>
      <AppointmentForm
        publishers={publishers}
        teamMembers={teamMembers}
        defaultDay={day}
        defaultTitle={title}
        defaultPublisherEntryId={publisherEntryId}
        defaultStartTime={time}
      />
    </div>
  );
}
