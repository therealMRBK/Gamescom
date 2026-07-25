"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

export type AppointmentInput = {
  title: string;
  publisherEntryId?: string | null;
  startTime: string;
  endTime: string;
  hall?: string;
  stand?: string;
  notes?: string;
  assignedUserIds: string[];
};

export async function createAppointment(input: AppointmentInput) {
  await requireSession();

  const appointment = await prisma.appointment.create({
    data: {
      title: input.title,
      publisherEntryId: input.publisherEntryId || null,
      startTime: new Date(input.startTime),
      endTime: new Date(input.endTime),
      hall: input.hall || null,
      stand: input.stand || null,
      notes: input.notes || null,
      assignments: {
        create: input.assignedUserIds.map((userId) => ({ userId })),
      },
    },
  });

  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  revalidatePath("/team");
  return appointment;
}

export async function updateAppointment(
  id: string,
  input: Partial<AppointmentInput>,
) {
  await requireSession();

  if (input.assignedUserIds) {
    await prisma.appointmentAssignment.deleteMany({
      where: { appointmentId: id },
    });
  }

  const appointment = await prisma.appointment.update({
    where: { id },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.publisherEntryId !== undefined && {
        publisherEntryId: input.publisherEntryId || null,
      }),
      ...(input.startTime !== undefined && {
        startTime: new Date(input.startTime),
      }),
      ...(input.endTime !== undefined && { endTime: new Date(input.endTime) }),
      ...(input.hall !== undefined && { hall: input.hall || null }),
      ...(input.stand !== undefined && { stand: input.stand || null }),
      ...(input.notes !== undefined && { notes: input.notes || null }),
      ...(input.assignedUserIds && {
        assignments: {
          create: input.assignedUserIds.map((userId) => ({ userId })),
        },
      }),
    },
  });

  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  revalidatePath("/team");
  return appointment;
}

export async function rescheduleAppointment(
  id: string,
  startTime: string,
  endTime: string,
) {
  await requireSession();

  await prisma.appointment.update({
    where: { id },
    data: { startTime: new Date(startTime), endTime: new Date(endTime) },
  });

  revalidatePath("/calendar");
  revalidatePath("/dashboard");
}

export async function deleteAppointment(id: string) {
  await requireSession();
  await prisma.appointment.delete({ where: { id } });
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  revalidatePath("/team");
}
