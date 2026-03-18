import { prisma } from "@allonfire/database";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function requireAuth() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
  return session;
}
