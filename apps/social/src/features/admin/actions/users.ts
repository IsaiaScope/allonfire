"use server";

import {
  deleteUser,
  getUsers as getUsersService,
  prisma,
} from "@allonfire/database";
import { hashPassword } from "better-auth/crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { requireAdmin } from "@/lib/server-auth";

export async function getUsersAction() {
  await requireAdmin();
  return await getUsersService();
}

const createUserSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(["ADMIN", "USER"]),
});

export async function createUserAction(data: {
  email: string;
  password: string;
  name: string;
  role: "ADMIN" | "USER";
}): Promise<ActionResult> {
  await requireAdmin();
  const parsed = createUserSchema.parse(data);

  const existing = await prisma.user.findUnique({
    where: { email: parsed.email },
    select: { id: true },
  });
  if (existing) {
    return {
      success: false as const,
      error: "A user with this email already exists",
    };
  }

  try {
    const hashedPassword = await hashPassword(parsed.password);

    const user = await prisma.user.create({
      data: {
        email: parsed.email,
        name: parsed.name,
        emailVerified: true,
        role: parsed.role,
      },
    });

    await prisma.account.create({
      data: {
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: hashedPassword,
      },
    });

    revalidatePath("/admin/users");
    return { success: true as const };
  } catch {
    return { success: false as const, error: "Failed to create user" };
  }
}

export async function deleteUserAction(userId: string): Promise<ActionResult> {
  const session = await requireAdmin();

  if (userId === session.user.id) {
    return { success: false as const, error: "Cannot delete yourself" };
  }

  try {
    const adminCount = await prisma.user.count({
      where: { role: "ADMIN" },
    });
    const targetUser = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { role: true },
    });
    if (targetUser.role === "ADMIN" && adminCount <= 1) {
      return {
        success: false as const,
        error: "Cannot delete the last admin",
      };
    }

    await deleteUser(userId);
    revalidatePath("/admin/users");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export async function updateUserRoleAction(
  userId: string,
  role: "ADMIN" | "USER"
): Promise<ActionResult> {
  const session = await requireAdmin();

  if (userId === session.user.id) {
    return {
      success: false as const,
      error: "You cannot change your own role",
    };
  }

  try {
    if (role === "USER") {
      const adminCount = await prisma.user.count({
        where: { role: "ADMIN" },
      });
      const targetUser = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { role: true },
      });
      if (targetUser.role === "ADMIN" && adminCount <= 1) {
        return {
          success: false as const,
          error: "Cannot demote the last admin",
        };
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${userId}`);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
