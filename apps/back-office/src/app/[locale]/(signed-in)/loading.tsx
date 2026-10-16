import { useTranslations } from "next-intl";
import {
  StationNotice,
  type StationSignage,
} from "@/shared/components/station-notice";

/** The waiting room's signage, decoration only: the status says it in words. */
const LOADING_SIGNAGE = {
  /** 待, wait: the stamp's figure. */
  CODE: "待",
  /** 接近中, approaching: what a platform board shows as a train comes in. */
  KANA: "接近中",
  /** 到着, arrival: brushed huge across the wall behind the page. */
  WALL_KANJI: "到着",
} as const satisfies StationSignage;

/** The board's lamps after the status, lit one after the other: its ellipsis. */
const LAMP_DELAYS = ["0ms", "200ms", "400ms"];

// The Suspense fallback while a signed-in page waits (home checks the
// Session). In this group, not at `[locale]`: a loading file above the
// catch-all would stream a 200 shell before its `notFound()`, and every
// unknown page would answer 200 instead of 404. The stamp lands only after
// half a second, its status on a small LED board just after, so a quick
// check shows nothing. The board's lamps pulse as long as the wait lasts:
// a loading indicator, which WCAG 2.2.2 counts as essential, standing still
// for reduced motion.
const Loading = () => {
  const t = useTranslations("Common.Loading");
  return (
    <StationNotice signage={LOADING_SIGNAGE}>
      <div className="led-board flex items-baseline gap-2 px-4 py-2 text-lg leading-tight">
        <p role="status">{t("label")}</p>
        <span aria-hidden className="flex gap-1">
          {LAMP_DELAYS.map((delay) => (
            <span
              className="size-1.5 rounded-sm bg-led motion-safe:animate-lamp"
              key={delay}
              style={{ animationDelay: delay }}
            />
          ))}
        </span>
      </div>
    </StationNotice>
  );
};

export default Loading;
