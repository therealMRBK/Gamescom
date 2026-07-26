import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppointmentForm } from "@/components/AppointmentForm";
import { DeleteButton } from "@/components/DeleteButton";
import { deleteAppointment } from "@/lib/actions/appointments";
import { ContentFieldsForm } from "@/components/ContentFieldsForm";

export default async function EditAppointmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [appointment, publishers, teamMembers] = await Promise.all([
    prisma.appointment.findUnique({
      where: { id },
      include: { assignments: true, contentPiece: true },
    }),
    prisma.publisherEntry.findMany({
      orderBy: { publisher: "asc" },
      select: { id: true, publisher: true },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!appointment) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/calendar" className="text-sm text-stone-400">
          ← Zurück
        </Link>
        <DeleteButton
          action={deleteAppointment.bind(null, appointment.id)}
          confirmText={`Termin "${appointment.title}" wirklich löschen?`}
          redirectTo="/calendar"
        />
      </div>

      <h1 className="text-lg font-bold text-white">Termin bearbeiten</h1>

      <AppointmentForm
        appointmentId={appointment.id}
        initial={{
          title: appointment.title,
          publisherEntryId: appointment.publisherEntryId,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          hall: appointment.hall,
          stand: appointment.stand,
          notes: appointment.notes,
          assignedUserIds: appointment.assignments.map((a) => a.userId),
        }}
        publishers={publishers}
        teamMembers={teamMembers}
      />

      <section className="rounded-xl bg-stone-900 p-4 ring-1 ring-stone-800">
        <h2 className="mb-3 text-sm font-semibold text-stone-300">Content-Pipeline</h2>
        <ContentFieldsForm
          key={(appointment.contentPiece?.updatedAt ?? appointment.updatedAt).toISOString()}
          appointmentId={appointment.id}
          initial={
            appointment.contentPiece
              ? {
                  format: appointment.contentPiece.format,
                  status: appointment.contentPiece.status,
                  embargoAt: appointment.contentPiece.embargoAt,
                  publishedAt: appointment.contentPiece.publishedAt,
                  link: appointment.contentPiece.link,
                  notes: appointment.contentPiece.notes,
                }
              : undefined
          }
        />
      </section>
    </div>
  );
}
