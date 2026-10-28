"use client";

import { objectFromEntries } from "@allonfire/core/shared/utils/object";
import { Toaster } from "@allonfire/shadcn/components/sonner";
import {
  IconAlertSquareRounded,
  IconInfoSquareRounded,
  IconLoader2,
  IconSquareRoundedCheck,
  IconSquareRoundedX,
  IconX,
} from "@tabler/icons-react";
import { cva } from "class-variance-authority";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import type { ToasterProps } from "sonner";
import { AOF_TOAST_KINDS, type AOFToastKind } from "../lib/use-aof-toast";
import { cn } from "../lib/utils";

/**
 * The page's edges (`--gutter-*`, ui's base.css), so a toast keeps clear of
 * a phone's corners, notch and home indicator. Sonner reads `mobileOffset`
 * below 600px and `offset` above, a phone in landscape included. The
 * fallback holds where base.css is not loaded (a component test).
 */
const EDGES = {
  bottom: "var(--gutter-bottom, 1.5rem)",
  left: "var(--gutter-left, 1.5rem)",
  right: "var(--gutter-right, 1.5rem)",
  top: "var(--gutter-top, 1.5rem)",
} as const satisfies ToasterProps["offset"];

/** Tabler's pictograms, as every AOF component draws, one family: each
 *  kind's sign in a rounded square, like a station's pictogram tile; the
 *  spinner stands still for reduced motion. */
const ICONS = {
  close: <IconX aria-hidden className="size-5" />,
  error: <IconSquareRoundedX aria-hidden />,
  info: <IconInfoSquareRounded aria-hidden />,
  loading: <IconLoader2 aria-hidden className="motion-safe:animate-spin" />,
  success: <IconSquareRoundedCheck aria-hidden />,
  warning: <IconAlertSquareRounded aria-hidden />,
} as const satisfies ToasterProps["icons"];

/**
 * A notice that says how something went is filled with its colour, deep
 * enough for white words and pictogram at 7:1 in both themes (the Design's
 * `--toast-*`, checked by its theme test), edged in a faint line of them; the
 * pictogram and the words say it without the colour. Its pictogram sits on a
 * darker band down the left edge, as a sign opens on its pictogram tile, at
 * the height of the first line (2px under the line's middle: the middle of
 * its lowercase letters). The close button is small, in the top right corner,
 * so the words keep the width. A toast that can be swiped away shows the
 * grab hand, grabbing while dragged. The plain toast keeps shadcn's popover.
 * Everything inside follows the toast's text colour (`current`). Sonner
 * styles a toast through attribute selectors, so these win with `!`; the
 * box is set on Sonner's own toasts only (`data-styled`), a custom one (the
 * Install hint) drawing its own.
 */
const notice = cva("border-current/15! text-toast-foreground!", {
  variants: {
    kind: {
      error: "bg-toast-error!",
      info: "bg-toast-info!",
      success: "bg-toast-success!",
      warning: "bg-toast-warning!",
    },
  },
});

const CLASS_NAMES = {
  closeButton: cn(
    "transform-none! top-1.5! right-1.5! left-auto! size-7! cursor-pointer rounded-md! border-0! bg-transparent! text-current! shadow-none! outline-none hover:bg-current/20! focus-visible:ring-3! focus-visible:ring-current/50! [&_svg]:stroke-[2.5]"
  ),
  // Under the message, which then reads as its title (bold); both stop at
  // five lines with an ellipsis.
  content: cn("has-data-description:*:data-title:font-bold!"),
  description: cn(
    "wrap-break-word line-clamp-5 text-current! text-sm! opacity-90"
  ),
  error: notice({ kind: "error" }),
  // Not positioned, so a backdrop inside it spans the whole toast; stretched
  // over the toast's own padding into a band.
  icon: cn(
    "static! flex! items-start! justify-center! self-stretch! mx-0! -my-3.5! h-auto! w-12! shrink-0 rounded-l-[inherit] bg-black/20 pt-4 [&>svg]:size-6"
  ),
  info: notice({ kind: "info" }),
  success: notice({ kind: "success" }),
  // A long message stops at five lines with an ellipsis.
  title: cn("wrap-break-word line-clamp-5"),
  toast: cn(
    "data-[styled=true]:items-start! font-sans! data-[dismissible=true]:cursor-grab data-[styled=true]:gap-3.5! data-[styled=true]:py-3.5! data-[styled=true]:pr-10! data-[styled=true]:pl-4! data-[styled=true]:text-base! data-[styled=true]:has-data-icon:pl-0! data-[dismissible=true]:active:cursor-grabbing"
  ),
  warning: notice({ kind: "warning" }),
} satisfies NonNullable<ToasterProps["toastOptions"]>["classNames"];

/** What a Design lays behind a kind's words (a kanji), per kind. */
export type AOFToastBackdrops = Partial<Record<AOFToastKind, ReactNode>>;

/** Each kind's pictogram, with its backdrop behind the toast's words, cut by
 *  its edges and sized by them (a container: `cqh` is the toast's height).
 *  Sonner keeps its own pseudo-elements on the toast, so the backdrop rides
 *  in the pictogram's slot (not positioned: it measures the toast). */
const iconsWith = (backdrops: AOFToastBackdrops | undefined) => ({
  ...ICONS,
  ...objectFromEntries(
    AOF_TOAST_KINDS.map((kind) => [
      kind,
      <>
        {ICONS[kind]}
        {backdrops?.[kind] ? (
          <span
            aria-hidden
            className="@container-size pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]"
          >
            {backdrops[kind]}
          </span>
        ) : null}
      </>,
    ])
  ),
});

// shadcn's Sonner under an AOF name; an App mounts one AOFToaster in its
// layout, inside NextIntlClientProvider, and sends toasts with useAOFToast
// (`lib/use-aof-toast`) from a client component. Add behaviour here, never
// in packages/shadcn. Every toast Sonner draws (not a custom one, which
// draws its own) has a close button, named in the page's language, as is
// the region they are announced in. A Design dresses each kind through
// `backdrops` (the Back Office lays a brush kanji behind it).
export const AOFToaster = ({
  backdrops,
  className,
  toastOptions,
  ...props
}: ToasterProps & { backdrops?: AOFToastBackdrops | undefined }) => {
  const t = useTranslations("Common.Toast");
  return (
    <Toaster
      // Wider than Sonner's 356px (set inline, so this wins with `!`); a
      // phone keeps the full width.
      className={cn("toaster group [--width:26rem]!", className)}
      closeButton
      containerAriaLabel={t("region")}
      icons={iconsWith(backdrops)}
      mobileOffset={EDGES}
      offset={EDGES}
      toastOptions={{
        classNames: CLASS_NAMES,
        closeButtonAriaLabel: t("close"),
        ...toastOptions,
      }}
      {...props}
    />
  );
};
