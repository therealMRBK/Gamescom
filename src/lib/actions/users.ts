"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSession } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { FocusArea, Role } from "@prisma/client";

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: Role;
  focusArea?: FocusArea | null;
  color?: string;
}) {
  await requireAdmin();

  const passwordHash = await bcrypt.hash(input.password, 10);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
      focusArea: input.focusArea || null,
      color: input.color || "#6366f1",
    },
  });

  revalidatePath("/team");
  revalidatePath("/admin/users");
  return user;
}

export async function updateUser(
  id: string,
  input: {
    name?: string;
    role?: Role;
    focusArea?: FocusArea | null;
    color?: string;
    password?: string;
  },
) {
  await requireAdmin();

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.role !== undefined) data.role = input.role;
  if (input.focusArea !== undefined) data.focusArea = input.focusArea;
  if (input.color !== undefined) data.color = input.color;
  if (input.password) data.passwordHash = await bcrypt.hash(input.password, 10);

  await prisma.user.update({ where: { id }, data });

  revalidatePath("/team");
  revalidatePath("/admin/users");
}

export async function deleteUser(id: string) {
  await requireAdmin();
  await prisma.user.delete({ where: { id } });
  revalidatePath("/team");
  revalidatePath("/admin/users");
}

export async function setAvailability(
  userId: string,
  day: string,
  onSite: boolean,
  timeFrom?: string,
  timeTo?: string,
) {
  const session = await requireSession();
  if (session.user.role !== "ADMIN" && session.user.id !== userId) {
    throw new Error("Nicht berechtigt");
  }

  await prisma.availability.upsert({
    where: { userId_day: { userId, day: new Date(day) } },
    create: {
      userId,
      day: new Date(day),
      onSite,
      timeFrom: timeFrom || null,
      timeTo: timeTo || null,
    },
    update: {
      onSite,
      timeFrom: timeFrom || null,
      timeTo: timeTo || null,
    },
  });

  revalidatePath("/team");
}
