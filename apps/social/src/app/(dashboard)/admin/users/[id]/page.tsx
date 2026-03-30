import { getUserById } from "@allonfire/database";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import { UserDetail } from "@/features/admin/components/user-detail";
import { auth } from "@/lib/auth";

const getCachedUser = cache(getUserById);

type UserDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: UserDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const user = await getCachedUser(id);
  return { title: user?.name ?? "User Detail" };
}

export default async function AdminUserDetailPage({
  params,
}: UserDetailPageProps) {
  const [session, { id }] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    params,
  ]);

  const user = await getCachedUser(id);

  if (!user) {
    notFound();
  }

  return <UserDetail currentUserId={session?.user.id ?? ""} user={user} />;
}
