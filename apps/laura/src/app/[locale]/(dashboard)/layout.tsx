import { checkAppAccess } from "@allonfire/auth/guard";
import { Wrapper } from "@allonfire/ui/components/wrapper";
import { setRequestLocale } from "next-intl/server";
import { UserRoleProvider } from "@/components/user-role-provider";
import { TopBar } from "@/features/layout/components/top-bar";
import { auth } from "@/lib/auth";

export default async function DashboardLayout({
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
          <div className="flex flex-1 flex-col p-3 md:p-4">{children}</div>
        </Wrapper>
      </Wrapper>
    </UserRoleProvider>
  );
}
