import { checkAppAccess } from "@allonfire/auth/guard";
import { Wrapper } from "@allonfire/ui/components/wrapper";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { DesktopSidebar } from "@/features/sidebar-layout/components/desktop-sidebar";
import { MobileSheetNav } from "@/features/sidebar-layout/components/mobile-sheet-nav";
import { MobileTopBar } from "@/features/sidebar-layout/components/mobile-top-bar";
import { QuickNavBadges } from "@/features/sidebar-layout/components/quick-nav-badges";
import { SidebarResizeHandle } from "@/features/sidebar-layout/components/sidebar-resize-handle";
import {
  COOKIE_NAME,
  DEFAULT_WIDTH,
  parseCookieState,
} from "@/features/sidebar-layout/constants/sidebar-constants";
import { SidebarProvider } from "@/features/sidebar-layout/providers/sidebar-provider";
import { auth } from "@/lib/auth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  );
}

async function DashboardShell({ children }: { children: React.ReactNode }) {
  const [{ session, user }, cookieStore] = await Promise.all([
    checkAppAccess(auth, "social"),
    cookies(),
  ]);
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

function DashboardSkeleton() {
  return (
    <Wrapper
      className="flex h-dvh flex-col overflow-hidden md:flex-row"
      tag="div"
    >
      {/* Mobile top bar skeleton */}
      <div className="flex h-14 items-center justify-between border-b bg-sidebar px-4 md:hidden">
        <div className="h-8 w-24 animate-pulse rounded bg-muted" />
        <div className="size-8 animate-pulse rounded bg-muted" />
      </div>
      {/* Desktop sidebar skeleton */}
      <div
        className="hidden shrink-0 border-r bg-sidebar md:block"
        style={{ width: DEFAULT_WIDTH }}
      >
        <div className="p-4">
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <Wrapper className="flex-1 overflow-y-auto" tag="main">
        <div className="mx-auto max-w-6xl p-4 md:p-8" />
      </Wrapper>
    </Wrapper>
  );
}
