import { checkAppAccess } from "@allonfire/auth/guard";
import { Wrapper } from "@allonfire/ui/components/wrapper";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { UserRoleProvider } from "@/components/user-role-provider";
import { TopBar } from "@/features/layout/components/top-bar";
import { auth } from "@/lib/auth";

export default function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardShell params={params}>{children}</DashboardShell>
    </Suspense>
  );
}

async function DashboardShell({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { session, user } = await checkAppAccess(auth, "laura");

  return (
    <UserRoleProvider role={user.role}>
      <Wrapper className="flex flex-1 flex-col overflow-hidden" tag="div">
        <TopBar email={session.user.email} name={session.user.name} />
        <Wrapper
          className="scrollbar-hide flex flex-1 flex-col overflow-y-auto"
          data-scroll-container
          tag="main"
        >
          <div className="flex flex-1 flex-col px-3 pt-3 pb-6 md:px-4 md:pt-4 md:pb-6">
            {children}
          </div>
        </Wrapper>
      </Wrapper>
    </UserRoleProvider>
  );
}

function DashboardSkeleton() {
  return (
    <Wrapper className="flex flex-1 flex-col overflow-hidden" tag="div">
      <div className="sticky top-0 z-40 flex h-15 items-center justify-between border-sidebar-border border-b bg-sidebar px-4 py-3 lg:z-30 lg:h-16 lg:border-border lg:bg-background/95 lg:py-0 lg:backdrop-blur lg:supports-[backdrop-filter]:bg-background/60">
        <div className="h-9 w-[120px] animate-pulse rounded bg-muted lg:h-[46px] lg:w-[156px]" />
        <div className="hidden lg:flex lg:items-center lg:gap-4">
          <div className="h-9 w-60 animate-pulse rounded bg-muted" />
        </div>
        <div className="size-8 animate-pulse rounded bg-muted lg:hidden" />
      </div>
      <Wrapper
        className="scrollbar-hide flex flex-1 flex-col overflow-y-auto"
        tag="main"
      >
        <div className="flex flex-1 flex-col px-3 pt-3 pb-6 md:px-4 md:pt-4 md:pb-6" />
      </Wrapper>
    </Wrapper>
  );
}
