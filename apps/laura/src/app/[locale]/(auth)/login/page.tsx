import { LoginForm } from "@allonfire/auth/components/login-form";
import { checkUserAppAccess } from "@allonfire/database";
import { ThemeToggle } from "@allonfire/ui/components/theme-toggle";
import { Heart } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { checkAppAccessAction } from "@/actions/check-access";
import { env } from "@/env";
import { auth } from "@/lib/auth";
import { baseUrl, getAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const seo = await getTranslations({ locale, namespace: "SEO" });

  return {
    title: seo("loginTitle"),
    description: seo("loginDescription"),
    openGraph: {
      title: seo("loginTitle"),
      description: seo("loginDescription"),
      type: "website",
      locale: locale === "it" ? "it_IT" : "en_US",
      siteName: seo("siteName"),
      url: `${baseUrl}/login`,
      images: [{ url: `${baseUrl}/opengraph-image`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: seo("loginTitle"),
      description: seo("loginDescription"),
      images: [`${baseUrl}/opengraph-image`],
    },
    alternates: getAlternates(locale, "/login"),
  };
}

export default function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return (
    <Suspense>
      <LoginContent params={params} />
    </Suspense>
  );
}

async function LoginContent({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    const hasAccess = await checkUserAppAccess(session.user.id, "laura");
    if (hasAccess) {
      redirect("/");
    }
  }

  const t = await getTranslations("Auth");

  return (
    <LoginForm
      appName="laura"
      checkAccess={checkAppAccessAction}
      emailPlaceholder="laura@domain.com"
      labels={{
        emailLabel: t("emailLabel"),
        passwordLabel: t("passwordLabel"),
        signIn: t("signIn"),
        signingIn: t("signingIn"),
        welcome: t("welcome"),
        emailRequired: t("emailRequired"),
        passwordRequired: t("passwordRequired"),
        loginFailed: t("loginFailed"),
        accessDenied: t("accessDenied"),
        showPassword: t("showPassword"),
        hidePassword: t("hidePassword"),
        viewerBannerTitle: t("viewerBannerTitle"),
        viewerBannerDescription: t("viewerBannerDescription"),
        useCredentials: t("useCredentials"),
      }}
      logoAlt="AllOnFire Laura"
      logoSrc="/allonfire-laura-horizontal.svg"
      subtitle={t("subtitle")}
      successIcon={<Heart className="size-5 animate-pulse" />}
      themeToggle={<ThemeToggle size="icon-lg" />}
      viewerCredentials={
        env.LAURA_VIEWER_EMAIL && env.LAURA_VIEWER_PASSWORD
          ? {
              email: env.LAURA_VIEWER_EMAIL,
              password: env.LAURA_VIEWER_PASSWORD,
            }
          : undefined
      }
    />
  );
}
