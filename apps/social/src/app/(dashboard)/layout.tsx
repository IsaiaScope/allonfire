import { prisma } from "@allonfire/database";
import { ScrollArea } from "@allonfire/ui/components/scroll-area";
import { Separator } from "@allonfire/ui/components/separator";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SidebarLogo, SidebarNav } from "@/components/sidebar-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { auth } from "@/lib/auth";

export default async function DashboardLayout({
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

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { role: true },
  });

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col border-sidebar-border border-r bg-sidebar">
        <div className="p-4">
          <SidebarLogo />
        </div>
        <Separator className="bg-sidebar-border" />
        <ScrollArea className="flex-1 py-4">
          <SidebarNav role={user.role} />
        </ScrollArea>
        <Separator className="bg-sidebar-border" />
        <div className="p-3">
          <div className="flex items-center justify-between">
            <UserMenu email={session.user.email} name={session.user.name} />
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl p-8">{children}</div>
      </main>
    </div>
  );
}
