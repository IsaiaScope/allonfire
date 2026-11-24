"use client";

import { aofErrorMeta } from "@allonfire/core/features/next/query/utils/aof-query-errors";
import { useAOFQuietToggle } from "@allonfire/ui/features/query/hooks/use-aof-quiet-toggle";
import { AOFButton } from "@allonfire/ui/shared/components/aof-button";
import { AOFTooltip } from "@allonfire/ui/shared/components/aof-tooltip";
import { cn } from "@allonfire/ui/shared/utils/utils";
import { IconHeart, IconHeartFilled } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { cva } from "class-variance-authority";
import { useTranslations } from "next-intl";
import { type ComponentProps, useCallback } from "react";
import { favoriteMutation } from "../utils/gallery-mutations";

/**
 * The heart, bare. On a photo it is the theme's blue with one dark, tight
 * shadow so it reads on a pale picture; on a bar (the preview's capsule, a card) it
 * reads in the text colour and casts none. A Favorite's is coral on both. Its
 * focus ring is a sharp 2px in the theme's blue.
 */
const heart = cva("", {
  variants: {
    surface: {
      bar: "size-6",
      photo: "filter-[drop-shadow(0_0_1px_var(--ink))] size-5",
    },
  },
});
/**
 * The ghost button turns its text to the foreground on hover, and a touch
 * screen keeps that hover after a tap: each colour is repeated for hover so
 * the heart never goes white.
 */
const tone = cva(
  "hover:bg-transparent focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-transparent",
  {
    compoundVariants: [
      {
        className: "text-primary hover:text-primary",
        marked: false,
        surface: "photo",
      },
    ],
    variants: {
      marked: { false: "", true: "text-coral hover:text-coral" },
      surface: { bar: "", photo: "" },
    },
  }
);

export type FavoriteControlProps = Omit<ComponentProps<"span">, "children"> & {
  /** An Admin sets and clears a Favorite; a User only sees it. */
  canMark: boolean;
  favorite: boolean;
  imageId: string;
  /** What the heart lies on: a photo (the default) or a bar of the page's own. */
  surface?: "bar" | "photo";
};

/**
 * One photo's Favorite. For an Admin, a toggle that shows the new state at
 * once (its name stays "Favorite" and `aria-pressed` carries the state; the
 * tip names the next step) and sends it when the taps stop (`useAOFQuietToggle`), so a burst is one
 * call, and none when it ends where it began; the feeds are patched before the
 * API answers. Keyed by the photo wherever the photo changes under it. A refusal puts it back and says so. For a User, a static mark on a Favorite and
 * nothing on any other photo: never a button.
 */
export const FavoriteControl = ({
  canMark,
  className,
  favorite,
  imageId,
  surface = "photo",
  ...props
}: FavoriteControlProps) => {
  const t = useTranslations("Gallery.favorite");
  const { mutate } = useMutation({
    ...favoriteMutation(imageId),
    meta: aofErrorMeta(t("failed")),
  });
  const { set, shown: marked } = useAOFQuietToggle({
    commit: mutate,
    confirmed: favorite,
  });
  const label = marked ? t("remove") : t("add");
  const toggle = useCallback(() => set(!marked), [marked, set]);
  if (!canMark) {
    return favorite ? (
      <span
        aria-label={t("is")}
        className={cn("text-coral", className)}
        role="img"
        {...props}
      >
        <IconHeartFilled aria-hidden className={heart({ surface })} />
      </span>
    ) : null;
  }
  return (
    <span className={cn("flex", className)} {...props}>
      <AOFTooltip label={label}>
        <AOFButton
          aria-label={t("toggle")}
          aria-pressed={marked}
          className={tone({ marked, surface })}
          onClick={toggle}
          size="icon"
          variant="ghost"
        >
          {marked ? (
            <IconHeartFilled aria-hidden className={heart({ surface })} />
          ) : (
            <IconHeart aria-hidden className={heart({ surface })} />
          )}
        </AOFButton>
      </AOFTooltip>
    </span>
  );
};
