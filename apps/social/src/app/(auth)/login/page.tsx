import { LoginForm } from "@allonfire/auth/components/login-form";
import { checkUserAppAccess } from "@allonfire/database";
import { ThemeToggle } from "@allonfire/ui/components/theme-toggle";
import { Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { checkAppAccessAction } from "@/actions/check-access";
import { env } from "@/env";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to AllOnFire Social Content Dashboard",
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

async function LoginContent() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    const hasAccess = await checkUserAppAccess(session.user.id, "social");
    if (hasAccess) {
      redirect("/");
    }
  }

  return (
    <LoginForm
      appName="social"
      checkAccess={checkAppAccessAction}
      emailPlaceholder="social@domain.com"
      logoAlt="AllOnFire Social"
      logoSrc="/allonfire-social-horizontal.svg"
      subtitle="Sign in to your dashboard"
      successIcon={<Sparkles className="size-5 animate-pulse" />}
      themeToggle={<ThemeToggle size="icon-lg" />}
      viewerCredentials={
        env.SOCIAL_VIEWER_EMAIL && env.SOCIAL_VIEWER_PASSWORD
          ? {
              email: env.SOCIAL_VIEWER_EMAIL,
              password: env.SOCIAL_VIEWER_PASSWORD,
            }
          : undefined
      }
    />
  );
}
