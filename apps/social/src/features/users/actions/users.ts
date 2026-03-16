"use server";

import {
  deleteUser,
  getUsers as getUsersService,
  prisma,
} from "@allonfire/database";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("Unauthorized");
  }
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
  return session;
}

export async function getUsersAction() {
  await requireAdmin();
  return await getUsersService();
}

const createUserSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

export async function createUserAction(data: {
  email: string;
  password: string;
  name: string;
}) {
  await requireAdmin();
  const parsed = createUserSchema.parse(data);

  await auth.api.signUpEmail({
    body: {
      email: parsed.email,
      password: parsed.password,
      name: parsed.name,
    },
  });

  revalidatePath("/users");
  return { success: true };
}

export async function deleteUserAction(userId: string) {
  const session = await requireAdmin();

  if (userId === session.user.id) {
    throw new Error("Cannot delete yourself");
  }

  // Prevent deleting the last admin
  const adminCount = await prisma.user.count({
    where: { role: "ADMIN" },
  });
  const targetUser = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { role: true },
  });
  if (targetUser.role === "ADMIN" && adminCount <= 1) {
    throw new Error("Cannot delete the last admin");
  }

  await deleteUser(userId);
  revalidatePath("/users");
  return { success: true };
}
