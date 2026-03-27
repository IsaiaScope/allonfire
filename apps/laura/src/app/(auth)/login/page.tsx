import { LoginForm } from "@allonfire/auth/components/login-form";
import { Heart } from "lucide-react";

export default function LoginPage() {
  return (
    <LoginForm
      appName="laura"
      logoAlt="AllOnFire Laura"
      logoSrc="/allonfire-laura-horizontal.svg"
      subtitle="Sign in to our gallery"
      successIcon={<Heart className="size-5 animate-pulse" />}
    />
  );
}
