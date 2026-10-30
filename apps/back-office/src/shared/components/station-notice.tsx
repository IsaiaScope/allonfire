import { pageTitle } from "@allonfire/core/features/metadata/utils/page-title";
import { AOFPage, type AOFPageProps } from "@allonfire/ui/components/aof-page";
import { cn } from "@allonfire/ui/lib/utils";
import { cva } from "class-variance-authority";
import type { ComponentType, ReactNode } from "react";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { BrushKanji } from "./brush-kanji";
import { EkiStamp } from "./eki-stamp";
import { NoticeTitle } from "./notice-title";

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

/**
 * How much the notice fills: a whole page (its `h1` names the tab), or a part
 * of one where something else stands (a table's rows), boxed as that part,
 * headed by an `h2` under the page's own heading. The stamp keeps its size:
 * its ring is drawn around its words, which a smaller ring cuts.
 */
const partFrame = cva(
  "relative isolate flex min-h-96 flex-1 flex-col items-center justify-center overflow-hidden rounded-lg border px-4 py-10"
);

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
  /** The notice's heading: on a page its `h1`, which also names the tab (a
   *  special page takes no metadata exports); in a part, an `h2`. */
  heading?: string;
  /** What frames the notice: the whole screen (`AOFPage`) unless it fills
   *  another frame's page area. */
  page?: ComponentType<AOFPageProps>;
  /** A whole page (the default) or a part of one; a part ignores `page`. */
  scope?: "page" | "part";
  signage: StationSignage;
};

/**
 * A station's notice, the page a special state shows (not found, an error,
 * a wait): a kanji brushed across the wall, the station's eki stamp pressed
 * in, then the words, then the action. Its `<title>` names the tab while
 * it shows (`NoticeTitle`).
 */
export const StationNotice = ({
  action,
  children,
  description,
  entrance = true,
  heading,
  page: Page = AOFPage,
  scope = "page",
  signage,
}: StationNoticeProps) => {
  const Heading = scope === "page" ? "h1" : "h2";
  const notice = (
    <>
      {heading && scope === "page" ? (
        <NoticeTitle>{pageTitle(heading, BACK_OFFICE.NAME)}</NoticeTitle>
      ) : null}
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
  return scope === "part" ? (
    <div className={partFrame()}>{notice}</div>
  ) : (
    <Page className="overflow-hidden" layout="centered">
      {notice}
    </Page>
  );
};
