import { LoginForm } from "@allonfire/auth/components/login-form";
import { checkUserAppAccess } from "@allonfire/database";
import { ThemeToggle } from "@allonfire/ui/components/theme-toggle";
import { Sparkles } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { checkAppAccessAction } from "@/actions/check-access";
import { auth } from "@/lib/auth";

export default async function LoginPage() {
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
      topRightSlot={<ThemeToggle />}
    />
  );
}
