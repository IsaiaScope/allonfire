"use client";

import { authClient } from "@allonfire/auth/client";
import { Badge } from "@allonfire/ui/components/badge";
import { Button } from "@allonfire/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@allonfire/ui/components/card";
import { LogOut, Mail, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

const INITIALS_SPLIT = /[\s@]/;

type UserInfoCardProps = {
  name: string | null;
  email: string;
  role: string;
  allowedApps: string[];
};

export function UserInfoCard({
  name,
  email,
  role,
  allowedApps,
}: UserInfoCardProps) {
  const t = useTranslations("Settings");
  const tNav = useTranslations("Nav");
  const router = useRouter();

  const initials = (name ?? email)
    .split(INITIALS_SPLIT)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
  }

  return (
    <Card className="gap-2 py-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <User className="size-4 text-primary" />
          {t("userInfo")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground text-sm">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">{name ?? email}</p>
            <p className="flex items-center gap-1 text-muted-foreground text-xs">
              <Mail className="size-3 shrink-0" />
              <span className="truncate">{email}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant={role === "ADMIN" ? "default" : "outline"}>
            {role}
          </Badge>
          {allowedApps.map((app) => (
            <Badge key={app} variant="secondary">
              {app}
            </Badge>
          ))}
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSignOut} size="sm" variant="default">
            <LogOut className="size-4" />
            {tNav("signOut")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
