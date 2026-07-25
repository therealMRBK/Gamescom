"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { ContentFormat, ContentStatus } from "@prisma/client";

export async function upsertContentPiece(
  appointmentId: string,
  input: {
    format: ContentFormat;
    status?: ContentStatus;
    embargoAt?: string | null;
    publishedAt?: string | null;
    link?: string;
    notes?: string;
  },
) {
  await requireSession();

  await prisma.contentPiece.upsert({
    where: { appointmentId },
    create: {
      appointmentId,
      format: input.format,
      status: input.status || "GEPLANT",
      embargoAt: input.embargoAt ? new Date(input.embargoAt) : null,
      publishedAt: input.publishedAt ? new Date(input.publishedAt) : null,
      link: input.link || null,
      notes: input.notes || null,
    },
    update: {
      format: input.format,
      ...(input.status !== undefined && { status: input.status }),
      embargoAt: input.embargoAt ? new Date(input.embargoAt) : null,
      publishedAt: input.publishedAt ? new Date(input.publishedAt) : null,
      link: input.link || null,
      notes: input.notes || null,
    },
  });

  revalidatePath("/content");
  revalidatePath("/calendar");
}

export async function updateContentStatus(
  appointmentId: string,
  status: ContentStatus,
) {
  await requireSession();

  await prisma.contentPiece.update({
    where: { appointmentId },
    data: {
      status,
      ...(status === "VEROEFFENTLICHT" && { publishedAt: new Date() }),
    },
  });

  revalidatePath("/content");
}
