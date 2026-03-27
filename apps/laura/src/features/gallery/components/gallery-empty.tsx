"use client";

import { Button } from "@allonfire/ui/components/button";
import { Images, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function GalleryEmpty() {
  const t = useTranslations("GalleryEmpty");

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <Images className="size-16 text-muted-foreground/50" />
      <div className="text-center">
        <h2 className="font-semibold text-lg">{t("title")}</h2>
        <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
      </div>
      <Button asChild>
        <Link href="/upload">
          <Upload className="size-4" />
          {t("uploadButton")}
        </Link>
      </Button>
    </div>
  );
}
