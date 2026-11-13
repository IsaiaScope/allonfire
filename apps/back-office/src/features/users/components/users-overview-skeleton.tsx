import {
  AOFCardAction,
  AOFCardContent,
  AOFCardHeader,
} from "@allonfire/ui/shared/components/aof-card";
import { cva } from "class-variance-authority";
import { useTranslations } from "next-intl";
import { CardFrame } from "@/shared/components/card-frame";
import { USERS } from "../constants/users";

/** A placeholder's ink: the foreground faint, pulsing only where motion is welcome. */
const ink = cva(
  "animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none",
  {
    variants: {
      shape: {
        badge: "h-5 w-20 sm:h-7",
        chart: "w-full",
        title: "h-7 w-32",
      },
    },
  }
);

/**
 * The overview while it loads, drawn as the card draws it so nothing moves
 * when the numbers arrive: the same frame, a title's line with an empty badge
 * at its right, and a chart's height.
 */
export const UsersOverviewSkeleton = () => {
  const t = useTranslations("Users.overview");
  return (
    <section aria-busy data-skeleton="card">
      <p className="sr-only" role="status">
        {t("title")}
      </p>
      <CardFrame kanji={USERS.CARD_KANJI}>
        <AOFCardHeader>
          <div aria-hidden className={ink({ shape: "title" })} />
          <AOFCardAction aria-hidden className="self-center">
            <div className={ink({ shape: "badge" })} />
          </AOFCardAction>
        </AOFCardHeader>
        <AOFCardContent>
          <div
            aria-hidden
            className={ink({ shape: "chart" })}
            style={{ height: USERS.OVERVIEW.CHART_HEIGHT_PX }}
          />
        </AOFCardContent>
      </CardFrame>
    </section>
  );
};
