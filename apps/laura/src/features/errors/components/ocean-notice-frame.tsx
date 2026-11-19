import { pageTitle } from "@allonfire/core/features/metadata/utils/page-title";
import { OCEAN_FACE } from "@allonfire/design/designs/ocean/ocean-mark";
import { AOFNoticeStage } from "@allonfire/ui/features/feedback/components/aof-notice-stage";
import { AOFNoticeTitle } from "@allonfire/ui/features/feedback/components/aof-notice-title";
import type {
  AOFNoticeFrame,
  AOFNoticeFrameProps,
} from "@allonfire/ui/features/feedback/types/notice";
import { cn } from "@allonfire/ui/shared/utils/utils";
import { cva } from "class-variance-authority";
import { OceanMark, type OceanMarkProps } from "@/shared/components/ocean-mark";
import { LAURA } from "@/shared/constants/laura";

/** The octopus each kind of notice shows: dizzy and coral for an error, lost or asleep in teal. */
const MARK = {
  error: { face: OCEAN_FACE.DIZZY, tone: "coral" },
  notFound: { face: OCEAN_FACE.LOST, tone: "teal" },
  offline: { face: OCEAN_FACE.SLEEPY, tone: "teal" },
} as const satisfies Record<
  AOFNoticeFrameProps["kind"],
  Pick<OceanMarkProps, "face" | "tone">
>;

/** What rises in: the octopus first, then the words and the action, once, never for reduced motion. */
const rise = cva("", {
  variants: {
    after: { mark: "", text: "motion-safe:delay-200" },
    entrance: {
      false: "",
      true: "motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:animate-in motion-safe:fill-mode-both motion-safe:duration-500",
    },
  },
});

/**
 * The notices drawn as a pool's: the octopus with the face of the moment, the
 * heading in Fraunces, the words, the action; a reference (an error's
 * digest) goes on an ink pill. A page names its tab while it shows.
 */
export const OceanNoticeFrame: AOFNoticeFrame = ({
  action,
  children,
  description,
  entrance = true,
  heading,
  kind,
  page,
  reference,
  scope = "page",
}) => {
  const Heading = scope === "page" ? "h1" : "h2";
  return (
    <AOFNoticeStage className="rounded-xl bg-card" page={page} scope={scope}>
      {heading && scope === "page" ? (
        <AOFNoticeTitle>{pageTitle(heading, LAURA.name)}</AOFNoticeTitle>
      ) : null}
      <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <OceanMark
          {...MARK[kind]}
          className={cn("size-36", rise({ after: "mark", entrance }))}
        />
        <div
          className={cn(
            "flex flex-col items-center gap-3",
            rise({ after: "text", entrance })
          )}
        >
          {heading ? (
            <Heading className="text-balance font-heading font-semibold text-3xl">
              {heading}
            </Heading>
          ) : null}
          {description ? (
            <p className="text-balance text-muted-foreground">{description}</p>
          ) : null}
          {children}
          {reference ? (
            <p className="rounded-lg bg-ink px-3 py-1 text-ink-foreground text-sm">
              {reference}
            </p>
          ) : null}
        </div>
        {action ? (
          <div className={rise({ after: "text", entrance })}>{action}</div>
        ) : null}
      </div>
    </AOFNoticeStage>
  );
};
