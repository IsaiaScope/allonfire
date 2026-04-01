import { checkAppAccess } from "@allonfire/auth/guard";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  AnimatedPageWrapper,
  AnimatedSection,
} from "@/components/animated-page";
import { PageContainer } from "@/features/layout/components/page-container";
import { AppearanceCard } from "@/features/settings/components/appearance-card";
import { LanguageCard } from "@/features/settings/components/language-card";
import { UserInfoCard } from "@/features/settings/components/user-info-card";
import { auth } from "@/lib/auth";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Settings" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Settings");
  const { session, user } = await checkAppAccess(auth, "laura");

  return (
    <PageContainer>
      <AnimatedPageWrapper className="mx-auto max-w-2xl space-y-6">
        <AnimatedSection>
          <h1 className="font-bold text-2xl tracking-tight">{t("title")}</h1>
        </AnimatedSection>
        <AnimatedSection>
          <LanguageCard />
        </AnimatedSection>
        <AnimatedSection>
          <AppearanceCard />
        </AnimatedSection>
        <AnimatedSection>
          <UserInfoCard
            allowedApps={user.allowedApps}
            email={session.user.email}
            name={session.user.name}
            role={user.role}
          />
        </AnimatedSection>
      </AnimatedPageWrapper>
    </PageContainer>
  );
}
