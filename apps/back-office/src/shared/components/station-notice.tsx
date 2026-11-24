import { pageTitle } from "@allonfire/core/features/metadata/utils/page-title";
import { AOFNoticeStage } from "@allonfire/ui/features/feedback/components/aof-notice-stage";
import { AOFNoticeTitle } from "@allonfire/ui/features/feedback/components/aof-notice-title";
import type { AOFNoticeFrameProps } from "@allonfire/ui/features/feedback/types/notice";
import { cn } from "@allonfire/ui/shared/utils/utils";
import { cva } from "class-variance-authority";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { BrushKanji } from "./brush-kanji";
import { EkiStamp } from "./eki-stamp";

/**
 * What rises in as the stamp lands, then the action: once, short, never for
 * reduced motion. `fill-mode-both` keeps each hidden until its turn.
 */
const rise = cva("", {
  compoundVariants: [
    { after: "stamp", class: "motion-safe:delay-700", entrance: true },
    { after: "text", class: "motion-safe:delay-1000", entrance: true },
  ],
  defaultVariants: { entrance: true },
  variants: {
    after: { stamp: "", text: "" },
    entrance: {
      false: "",
      true: "motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:animate-in motion-safe:fill-mode-both motion-safe:duration-500",
    },
  },
});

/** A notice's signage, decoration only: the page says it in words. */
export type StationSignage = {
  /** The eki stamp's figure. */
  CODE: string;
  /** The stamp's kana. */
  KANA: string;
  /** Brushed huge across the wall behind the page. */
  WALL_KANJI: string;
};

/**
 * What a station notice takes: the shared notice's props (`AOFNoticeFrameProps`:
 * heading, description, action, entrance, page, scope) less the `kind` and
 * `reference` the frame binding adds, plus its station's signage. `entrance`
 * false stands all of it from the first frame: a wait is often over before
 * the stamp would land, leaving only the wall kanji on screen.
 */
export type StationNoticeProps = Omit<
  AOFNoticeFrameProps,
  "kind" | "reference"
> & {
  signage: StationSignage;
};

/**
 * A station's notice, the page a special state shows (not found, an error,
 * a wait): a kanji brushed across the wall, the station's eki stamp pressed
 * in, then the words, then the action. Its `<title>` names the tab while
 * it shows (`AOFNoticeTitle`).
 */
export const StationNotice = ({
  action,
  children,
  description,
  entrance = true,
  heading,
  page,
  scope = "page",
  signage,
}: StationNoticeProps) => {
  const Heading = scope === "page" ? "h1" : "h2";
  const notice = (
    <>
      {heading && scope === "page" ? (
        <AOFNoticeTitle>{pageTitle(heading, BACK_OFFICE.name)}</AOFNoticeTitle>
      ) : null}
      <BrushKanji kanji={signage.WALL_KANJI} />
      <div className="flex w-full max-w-sm flex-col items-center gap-8 text-center">
        <EkiStamp
          code={signage.CODE}
          entrance={entrance}
          kana={signage.KANA}
          station={BACK_OFFICE.name}
        />
        <div
          className={cn(
            "flex flex-col items-center gap-3",
            rise({ after: "stamp", entrance })
          )}
        >
          {heading ? (
            <Heading className="text-balance font-bold text-3xl">
              {heading}
            </Heading>
          ) : null}
          {description ? (
            <p className="text-balance text-muted-foreground">{description}</p>
          ) : null}
          {children}
        </div>
        {action ? (
          <div className={rise({ after: "text", entrance })}>{action}</div>
        ) : null}
      </div>
    </>
  );
  return (
    <AOFNoticeStage className="rounded-lg" page={page} scope={scope}>
      {notice}
    </AOFNoticeStage>
  );
};
