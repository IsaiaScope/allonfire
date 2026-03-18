import { prisma } from "@allonfire/database";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminSubNav } from "@/features/admin/components/admin-sub-nav";
import { auth } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const currentUser = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (currentUser.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-2xl tracking-tight">Admin Panel</h1>
        <p className="text-muted-foreground text-sm">
          Manage users and AI providers.
        </p>
      </div>

      <div className="flex flex-col gap-8 md:flex-row">
        <AdminSubNav />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
