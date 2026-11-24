import { pageTitle } from "@allonfire/core/features/metadata/utils/page-title";
import type { OceanArtKey } from "@allonfire/design/designs/ocean/mascot-art";
import { AOFNoticeStage } from "@allonfire/ui/features/feedback/components/aof-notice-stage";
import { AOFNoticeTitle } from "@allonfire/ui/features/feedback/components/aof-notice-title";
import type {
  AOFNoticeFrame,
  AOFNoticeFrameProps,
} from "@allonfire/ui/features/feedback/types/notice";
import { cn } from "@allonfire/ui/shared/utils/utils";
import { cva } from "class-variance-authority";
import { OceanArt } from "@/shared/components/ocean-art";
import { LAURA } from "@/shared/constants/laura";
import { MASCOT } from "@/shared/constants/mascots";

/** The picture each kind of notice shows: the octopus for an error, the squid lost, the jellyfish offline. */
const ART = {
  error: MASCOT.ERROR,
  notFound: MASCOT.NOT_FOUND,
  offline: MASCOT.OFFLINE,
} as const satisfies Record<AOFNoticeFrameProps["kind"], OceanArtKey>;

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

export type OceanNoticeProps = Omit<AOFNoticeFrameProps, "kind"> & {
  /** The picture of the moment: a `MASCOT` entry. */
  art: OceanArtKey;
};

/**
 * A notice drawn as a pool's: the picture of its moment, the heading in
 * Fraunces, the words, the action; a reference (an error's digest) goes on an
 * ink pill. A page names its tab while it shows.
 */
export const OceanNotice = ({
  action,
  art,
  children,
  description,
  entrance = true,
  heading,
  page,
  reference,
  scope = "page",
}: OceanNoticeProps) => {
  const Heading = scope === "page" ? "h1" : "h2";
  return (
    <AOFNoticeStage className="rounded-xl bg-card" page={page} scope={scope}>
      {heading && scope === "page" ? (
        <AOFNoticeTitle>{pageTitle(heading, LAURA.name)}</AOFNoticeTitle>
      ) : null}
      <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <OceanArt
          art={art}
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

/** The shared notices drawn as a pool's: the picture each kind has in `MASCOT`. */
export const OceanNoticeFrame: AOFNoticeFrame = ({ kind, ...props }) => (
  <OceanNotice art={ART[kind]} {...props} />
);
