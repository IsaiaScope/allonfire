"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@allonfire/ui/components/card";
import { ThemeToggle } from "@allonfire/ui/components/theme-toggle";
import { Sun } from "lucide-react";
import { useTranslations } from "next-intl";

export function AppearanceCard() {
  const t = useTranslations("Settings");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sun className="size-4 text-primary" />
          {t("appearance")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            {t("appearanceDescription")}
          </p>
          <ThemeToggle />
        </div>
      </CardContent>
    </Card>
  );
}
