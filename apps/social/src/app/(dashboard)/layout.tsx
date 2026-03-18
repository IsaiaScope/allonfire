import { prisma } from "@allonfire/database";
import { Wrapper } from "@allonfire/ui/components/wrapper";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { DesktopSidebar } from "@/features/sidebar-layout/components/desktop-sidebar";
import { MobileSheetNav } from "@/features/sidebar-layout/components/mobile-sheet-nav";
import { MobileTopBar } from "@/features/sidebar-layout/components/mobile-top-bar";
import { QuickNavBadges } from "@/features/sidebar-layout/components/quick-nav-badges";
import { SidebarResizeHandle } from "@/features/sidebar-layout/components/sidebar-resize-handle";
import {
  COOKIE_NAME,
  parseCookieState,
} from "@/features/sidebar-layout/constants/sidebar-constants";
import { SidebarProvider } from "@/features/sidebar-layout/providers/sidebar-provider";
import { auth } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
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
  const sidebarCookie = cookieStore.get(COOKIE_NAME)?.value;
  const defaultState = parseCookieState(sidebarCookie);

  return (
    <SidebarProvider defaultState={defaultState}>
      <Wrapper
        className="flex h-dvh flex-col overflow-hidden md:flex-row"
        tag="div"
      >
        <MobileTopBar />
        <QuickNavBadges role={user.role} />

        <DesktopSidebar
          email={session.user.email}
          name={session.user.name}
          role={user.role}
        />
        <SidebarResizeHandle />

        <MobileSheetNav
          email={session.user.email}
          name={session.user.name}
          role={user.role}
        />

        <Wrapper className="flex-1 overflow-y-auto" tag="main">
          <div className="mx-auto max-w-6xl p-4 md:p-8">{children}</div>
        </Wrapper>
      </Wrapper>
    </SidebarProvider>
  );
}
