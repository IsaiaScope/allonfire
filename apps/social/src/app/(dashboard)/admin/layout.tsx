import { checkAppAccess } from "@allonfire/auth/guard";
import { redirect } from "next/navigation";
import { AdminSubNav } from "@/features/admin/components/admin-sub-nav";
import { auth } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await checkAppAccess(auth, "social");

  if (user.role !== "ADMIN") {
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
