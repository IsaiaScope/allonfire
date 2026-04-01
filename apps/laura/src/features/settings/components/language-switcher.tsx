"use client";

import { Button } from "@allonfire/ui/components/button";
import { cn } from "@allonfire/ui/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

const locales = [
  { code: "it" as const, labelKey: "italian" as const },
  { code: "en" as const, labelKey: "english" as const },
];

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("Settings");

  function switchLocale(newLocale: string) {
    router.replace(pathname, { locale: newLocale });
  }

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm">
        {t("languageDescription")}
      </p>
      <div className="flex gap-2">
        {locales.map((l) => (
          <Button
            className={cn(locale === l.code && "border-primary")}
            key={l.code}
            onClick={() => switchLocale(l.code)}
            variant={locale === l.code ? "secondary" : "outline"}
          >
            {t(l.labelKey)}
          </Button>
        ))}
      </div>
    </div>
  );
}
