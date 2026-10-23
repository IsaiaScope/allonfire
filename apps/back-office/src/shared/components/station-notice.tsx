import { pageTitle } from "@allonfire/core/features/metadata/utils/page-title";
import { AOFPage, type AOFPageProps } from "@allonfire/ui/components/aof-page";
import { cn } from "@allonfire/ui/lib/utils";
import { cva } from "class-variance-authority";
import type { ComponentType, ReactNode } from "react";
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

export type StationNoticeProps = {
  /** What follows the notice, rising in after its words. */
  action?: ReactNode;
  /** More words under the description (a reference, a status). */
  children?: ReactNode;
  description?: string;
  /** Whether the stamp lands and the words rise in (the default), or all of
   *  it stands from the first frame: a wait is often over before an
   *  entrance would end, leaving only the wall kanji on screen. */
  entrance?: boolean;
  /** The page's `h1`, which also names the tab: a special page takes no
   *  metadata exports. */
  heading?: string;
  /** What frames the notice: the whole screen (`AOFPage`) unless it fills
   *  another frame's page area. */
  page?: ComponentType<AOFPageProps>;
  signage: StationSignage;
};

/**
 * A station's notice, the page a special state shows (not found, an error,
 * a wait): a kanji brushed across the wall, the station's eki stamp pressed
 * in, then the words, then the action. React 19 hoists the `<title>` into
 * the head.
 */
export const StationNotice = ({
  action,
  children,
  description,
  entrance = true,
  heading,
  page: Page = AOFPage,
  signage,
}: StationNoticeProps) => (
  <Page className="overflow-hidden" layout="centered">
    {heading ? <title>{pageTitle(heading, BACK_OFFICE.NAME)}</title> : null}
    <BrushKanji kanji={signage.WALL_KANJI} />
    <div className="flex w-full max-w-sm flex-col items-center gap-8 text-center">
      <EkiStamp
        code={signage.CODE}
        entrance={entrance}
        kana={signage.KANA}
        station={BACK_OFFICE.NAME}
      />
      <div
        className={cn(
          "flex flex-col items-center gap-3",
          rise({ after: "stamp", entrance })
        )}
      >
        {heading ? (
          <h1 className="text-balance font-bold text-3xl">{heading}</h1>
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
  </Page>
);
