import { prisma } from "@allonfire/database";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";

export function createAuth(env: {
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
}) {
  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    emailAndPassword: { enabled: true },
    session: { cookieCache: { enabled: true, maxAge: 5 * 60 } },
    plugins: [nextCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type Session = Auth["$Infer"]["Session"];

export async function requireAuth(auth: Auth): Promise<Session> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requireAdmin(auth: Auth): Promise<Session> {
  const session = await requireAuth(auth);
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
  return session;
}
