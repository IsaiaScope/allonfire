"use client";

import { authClient } from "@allonfire/auth/client";
import { Button } from "@allonfire/ui/components/button";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function SignOutButton() {
  const router = useRouter();
  const t = useTranslations("Nav");

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
  }

  return (
    <Button onClick={handleSignOut} size="sm" variant="default">
      <LogOut className="size-4" />
      {t("signOut")}
    </Button>
  );
}
