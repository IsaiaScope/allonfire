import { LoginForm } from "@allonfire/auth/components/login-form";
import { ThemeToggle } from "@allonfire/ui/components/theme-toggle";
import { Sparkles } from "lucide-react";
import { checkAppAccessAction } from "@/actions/check-access";

export default function LoginPage() {
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
