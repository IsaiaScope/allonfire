import {
  AOFCardContent,
  AOFCardHeader,
} from "@allonfire/ui/shared/components/aof-card";
import { cn } from "@allonfire/ui/shared/utils/utils";
import {
  IconAt,
  IconCalendarStats,
  IconSun,
  IconTag,
} from "@tabler/icons-react";
import { cva } from "class-variance-authority";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { CardFrame } from "@/shared/components/card-frame";
import { SERVICES } from "../constants/services";

/**
 * A placeholder's ink: the foreground faint, pulsing only where motion is
 * welcome, as the Users list's.
 */
const ink = cva(
  "animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none",
  {
    variants: {
      shape: {
        /** Its slot badge. */
        badge: "h-5 w-14 sm:h-7",
        caption: "h-3.5 w-10",
        /** The provider's Gooey choice, taller than a field. */
        choice: "h-[46.8px] w-48 rounded-lg",
        /** A field's box and a choice's. */
        field: "h-(--field-height) rounded-lg",
        /** The ring's number and its caption, in its middle. */
        number: "h-8 w-14",
        /** The Save button. */
        save: "h-(--field-height) w-28 rounded-lg",
        /** The Service's switch at the title's end. */
        service: "h-10 w-28 rounded-lg",
        /** The test button: an icon square on a narrow card, wider from `@lg`. */
        test: "@lg:h-8 h-(--field-height) @lg:w-44 w-(--field-height)",
        /** The card's name, a title's line. */
        title: "h-7 w-40",
      },
    },
  }
);

/** A ring's empty track at the size and weight the meter draws it, with the
 *  number and caption bars where its middle will be. */
const RingSkeleton = ({ label }: { label: string }) => (
  <div className="flex flex-col items-center gap-1">
    <div
      className="relative flex size-36 flex-col items-center justify-center gap-1.5 rounded-full border-14 border-foreground/10"
      data-skeleton="ring"
    >
      <div className={ink({ shape: "number" })} />
      <div className={ink({ shape: "caption" })} />
    </div>
    <span className="font-bold text-sm">{label}</span>
  </div>
);

/** One field as the form draws it: its bold label, its box on the dark tile
 *  of its icon, and the line kept under it for an error. */
const FieldSkeleton = ({ icon, label }: { icon: ReactNode; label: string }) => (
  <div className="flex flex-col gap-2">
    <span className="font-bold text-sm leading-snug">{label}</span>
    <div
      className={cn(ink({ shape: "field" }), "relative")}
      data-skeleton="field"
    >
      <span
        aria-hidden="true"
        className="dark absolute inset-y-1 left-1 flex w-(--field-tile) items-center justify-center rounded-sm bg-background text-foreground *:size-5"
      >
        {icon}
      </span>
    </div>
    <div className="min-h-6" />
  </div>
);

/**
 * A Service's page while its providers load, drawn as the page draws them so
 * nothing moves when they arrive: the title it already knows, one provider's
 * card (the same frame), and in it the words that never change (Today, Last
 * 31 days, each field's label) with empty shapes where the data will be.
 * Drawn here rather than with the real card, which needs the providers it is
 * waiting for; its browser test checks the two are the same height.
 */
export const ServicesSkeleton = ({ title }: { title: ReactNode }) => {
  const t = useTranslations("Services");
  return (
    <section aria-busy className="flex flex-col gap-4">
      <p className="sr-only" role="status">
        {t("loading")}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-4">
        {title}
        <div aria-hidden className={ink({ shape: "service" })} />
      </div>
      <div aria-hidden="true" data-skeleton="card">
        <CardFrame kanji={SERVICES.CARD_KANJI}>
          <AOFCardHeader className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className={ink({ shape: "title" })} />
              <div className={ink({ shape: "badge" })} />
            </div>
            <div className={ink({ shape: "test" })} />
          </AOFCardHeader>
          <AOFCardContent className="flex flex-col gap-6">
            <div className="grid grid-cols-2 justify-items-center gap-6">
              <RingSkeleton label={t("usage.today")} />
              <RingSkeleton label={t("usage.lastMonth")} />
            </div>
            <div className="grid @2xl:grid-cols-2 @2xl:gap-x-6">
              <FieldSkeleton icon={<IconTag />} label={t("field.name")} />
              <FieldSkeleton icon={<IconAt />} label={t("field.fromAddress")} />
              <FieldSkeleton icon={<IconSun />} label={t("field.dailyLimit")} />
              <FieldSkeleton
                icon={<IconCalendarStats />}
                label={t("field.monthlyLimit")}
              />
              <div className="@2xl:col-start-1 mb-8 flex flex-col gap-2">
                <span className="font-bold text-sm">{t("enabled.label")}</span>
                <div className={ink({ shape: "choice" })} />
              </div>
              {/* The line kept for the form's alert, as the form keeps it. */}
              <div className="@2xl:col-span-2 mt-2 min-h-13.5" />
              <div className="@2xl:col-span-2 flex justify-end pt-2">
                <div className={ink({ shape: "save" })} />
              </div>
            </div>
          </AOFCardContent>
        </CardFrame>
      </div>
    </section>
  );
};
