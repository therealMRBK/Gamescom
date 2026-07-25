"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { Category, ContactChannel, ContactStatus, Priority } from "@prisma/client";

export type PublisherEntryInput = {
  publisher: string;
  games: string[];
  hall?: string;
  priority: Priority;
  category?: Category | null;
  contactChannel: ContactChannel;
  contactPersonName?: string;
  contactPersonEmail?: string;
  assignedUserId?: string | null;
  notes?: string;
};

export async function createPublisherEntry(input: PublisherEntryInput) {
  await requireSession();

  const entry = await prisma.publisherEntry.create({
    data: {
      publisher: input.publisher,
      games: input.games,
      hall: input.hall || null,
      priority: input.priority,
      category: input.category || null,
      contactChannel: input.contactChannel,
      contactPersonName: input.contactPersonName || null,
      contactPersonEmail: input.contactPersonEmail || null,
      assignedUserId: input.assignedUserId || null,
      notes: input.notes || null,
    },
  });

  await prisma.statusHistory.create({
    data: {
      entryId: entry.id,
      oldStatus: null,
      newStatus: "NICHT_KONTAKTIERT",
    },
  });

  revalidatePath("/publishers");
  revalidatePath("/dashboard");
  return entry;
}

export async function updatePublisherEntry(
  id: string,
  input: Partial<PublisherEntryInput>,
) {
  await requireSession();

  const entry = await prisma.publisherEntry.update({
    where: { id },
    data: {
      ...(input.publisher !== undefined && { publisher: input.publisher }),
      ...(input.games !== undefined && { games: input.games }),
      ...(input.hall !== undefined && { hall: input.hall || null }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.contactChannel !== undefined && {
        contactChannel: input.contactChannel,
      }),
      ...(input.contactPersonName !== undefined && {
        contactPersonName: input.contactPersonName || null,
      }),
      ...(input.contactPersonEmail !== undefined && {
        contactPersonEmail: input.contactPersonEmail || null,
      }),
      ...(input.assignedUserId !== undefined && {
        assignedUserId: input.assignedUserId || null,
      }),
      ...(input.notes !== undefined && { notes: input.notes || null }),
    },
  });

  revalidatePath("/publishers");
  revalidatePath(`/publishers/${id}`);
  revalidatePath("/dashboard");
  return entry;
}

export async function updateContactStatus(id: string, newStatus: ContactStatus) {
  const session = await requireSession();

  const current = await prisma.publisherEntry.findUniqueOrThrow({ where: { id } });

  await prisma.$transaction([
    prisma.publisherEntry.update({
      where: { id },
      data: { contactStatus: newStatus },
    }),
    prisma.statusHistory.create({
      data: {
        entryId: id,
        oldStatus: current.contactStatus,
        newStatus,
        changedById: session.user.id,
      },
    }),
  ]);

  revalidatePath("/publishers");
  revalidatePath(`/publishers/${id}`);
  revalidatePath("/dashboard");
}

export async function deletePublisherEntry(id: string) {
  await requireSession();
  await prisma.publisherEntry.delete({ where: { id } });
  revalidatePath("/publishers");
  revalidatePath("/dashboard");
}
