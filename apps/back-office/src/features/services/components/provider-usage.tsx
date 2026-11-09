"use client";

import { AOFRadialMeter } from "@allonfire/ui/features/chart/components/aof-radial-meter";
import { aofToast } from "@allonfire/ui/shared/hooks/use-aof-toast";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import type { ListedProvider } from "../utils/services-queries";

/**
 * How much a provider sent, as two rings (today, the UTC day, against the
 * daily limit; the last 31 days against the monthly one), centred and evenly
 * spread. What it sent is what the provider's own API reports; a limit is the
 * one the provider reports, else the one an Admin set on its row. When the
 * provider could not say (its key refused the stats, or it is down) the
 * rings draw empty and a toast says so, once.
 */
export const ProviderUsage = ({ provider }: { provider: ListedProvider }) => {
  const t = useTranslations("Services");
  const { dailyLimit, monthlyLimit, name, usage } = provider;
  useEffect(() => {
    if (usage === null) {
      aofToast(t("usage.unread", { name }), "error");
    }
  }, [usage, name, t]);
  const day = usage?.day ?? 0;
  const month = usage?.month ?? 0;
  const dayMax = usage?.dayLimit ?? dailyLimit;
  const monthMax = usage?.monthLimit ?? monthlyLimit;
  return (
    <div className="grid grid-cols-2 justify-items-center gap-6">
      <div className="flex flex-col items-center gap-1">
        <AOFRadialMeter
          aria-label={t("usage.day", { limit: dayMax, used: day })}
          caption={t("usage.of", { limit: dayMax })}
          color="var(--chart-1)"
          max={dayMax}
          value={day}
        />
        <span className="font-bold text-sm">{t("usage.today")}</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <AOFRadialMeter
          aria-label={
            monthMax === null
              ? t("usage.monthNone", { used: month })
              : t("usage.month", { limit: monthMax, used: month })
          }
          caption={
            monthMax === null
              ? t("usage.noLimit")
              : t("usage.of", { limit: monthMax })
          }
          color="var(--chart-2)"
          max={monthMax}
          value={month}
        />
        <span className="font-bold text-sm">{t("usage.lastMonth")}</span>
      </div>
    </div>
  );
};
