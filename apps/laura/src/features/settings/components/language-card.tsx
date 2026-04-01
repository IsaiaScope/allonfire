"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@allonfire/ui/components/card";
import { Languages } from "lucide-react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "./language-switcher";

export function LanguageCard() {
  const t = useTranslations("Settings");

  return (
    <Card className="gap-2 py-4 transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Languages className="size-4 text-primary" />
          {t("language")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <LanguageSwitcher />
      </CardContent>
    </Card>
  );
}
