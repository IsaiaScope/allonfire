import {
  AOFCardAction,
  AOFCardContent,
  AOFCardHeader,
} from "@allonfire/ui/shared/components/aof-card";
import { cva } from "class-variance-authority";
import { useTranslations } from "next-intl";
import { CardFrame } from "@/shared/components/card-frame";
import { STORAGE } from "../constants/storage";

/** A placeholder's ink: the foreground faint, pulsing only where motion is welcome. */
const ink = cva(
  "animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none",
  {
    variants: {
      shape: {
        badge: "h-5 w-20 sm:h-7",
        chart: "w-full",
        title: "h-7 w-44",
      },
    },
  }
);

/**
 * The overview while it loads, drawn as a card draws it so nothing moves when
 * the numbers arrive: the same frame, a title's line with empty badges at its right, and the
 * chart's height. One card: the list is only known once it is read.
 */
export const StorageOverviewSkeleton = () => {
  const t = useTranslations("Storage");
  return (
    <section aria-busy data-skeleton="card">
      <p className="sr-only" role="status">
        {t("title")}
      </p>
      <CardFrame kanji={STORAGE.KANJI.IMAGE}>
        <AOFCardHeader>
          <div aria-hidden className={ink({ shape: "title" })} />
          <AOFCardAction
            aria-hidden
            className="flex items-center gap-2 self-center"
          >
            <div className={ink({ shape: "badge" })} />
            <div className={ink({ shape: "badge" })} />
          </AOFCardAction>
        </AOFCardHeader>
        <AOFCardContent className="flex flex-col gap-6">
          <div
            aria-hidden
            className={ink({ shape: "chart" })}
            style={{ height: STORAGE.OVERVIEW.CHART_HEIGHT_PX }}
          />
        </AOFCardContent>
      </CardFrame>
    </section>
  );
};
