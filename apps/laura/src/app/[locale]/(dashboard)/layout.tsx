import { checkAppAccess } from "@allonfire/auth/guard";
import { Wrapper } from "@allonfire/ui/components/wrapper";
import { setRequestLocale } from "next-intl/server";
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

  await checkAppAccess(auth, "laura");

  return (
    <Wrapper className="flex h-dvh flex-col overflow-hidden" tag="div">
      <TopBar />
      <Wrapper className="flex-1 overflow-y-auto" tag="main">
        <div className="mx-auto max-w-6xl p-4 md:p-8">{children}</div>
      </Wrapper>
    </Wrapper>
  );
}
