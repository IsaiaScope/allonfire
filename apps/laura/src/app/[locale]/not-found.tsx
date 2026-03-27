"use client";

import { Button } from "@allonfire/ui/components/button";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("NotFound");

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <h2 className="font-semibold text-xl">{t("title")}</h2>
      <Button asChild variant="outline">
        <Link href="/">{t("goHome")}</Link>
      </Button>
    </div>
  );
}
