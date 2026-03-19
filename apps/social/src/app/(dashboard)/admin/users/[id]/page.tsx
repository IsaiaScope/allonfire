import { getUserById } from "@allonfire/database";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { UserDetail } from "@/features/admin/components/user-detail";
import { auth } from "@/lib/auth";

type UserDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminUserDetailPage({
  params,
}: UserDetailPageProps) {
  const [session, { id }] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    params,
  ]);

  const user = await getUserById(id);

  if (!user) {
    notFound();
  }

  return <UserDetail currentUserId={session?.user.id ?? ""} user={user} />;
}
