import { AUTH } from "@allonfire/auth/shared/constants/auth";
import {
  AOFAvatar,
  AOFAvatarFallback,
} from "@allonfire/ui/components/aof-avatar";
import { AOFImage } from "@allonfire/ui/components/aof-image";
import { tileBlur } from "@allonfire/ui/lib/tile-blur";
import type { ComponentPropsWithoutChildren } from "@allonfire/ui/lib/types";
import { cn } from "@allonfire/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

/** The initial's tile, in the colour of where it stands: the account's
 *  primary (the sidebar), or the deep line green (the Users list). */
const initial = cva("font-semibold", {
  defaultVariants: { tone: "line" },
  variants: {
    tone: {
      line: "bg-(--line-green-deep) text-(--line-green-deep-foreground)",
      primary: "bg-primary text-primary-foreground",
    },
  },
});

/** A picture that failed (an expired link, a dead address) hides, so the
 *  initial under it shows instead of the browser's broken-image glyph. */
const hideOnError = ({ currentTarget }: { currentTarget: HTMLElement }) => {
  currentTarget.hidden = true;
};

/** A sign-in provider's picture, which the App's optimizer may fetch. */
const fromProvider = (image: string): boolean => {
  const host = URL.parse(image)?.hostname;
  return AUTH.PICTURE_HOSTS.some((picture) => picture === host);
};

export type UserAvatarProps = ComponentPropsWithoutChildren<typeof AOFAvatar> &
  VariantProps<typeof initial> & {
    /** The blur the API answers beside a stored Avatar, shown from 40 px. */
    blurDataUrl?: string | null | undefined;
    /** Their picture's address as the API answers it: a stored Avatar's
     *  signed image-server link, or a sign-in provider's picture; none, and
     *  only the initial shows. */
    image: string | null | undefined;
    /** Whose initial shows: their name, else their email. */
    name: string;
    /** The side it is drawn at, in CSS pixels: what the optimizer sizes the
     *  picture for (2x and 3x screens included). */
    side: number;
  };

/**
 * A User's picture on a tile, or the first letter of their name. The tile
 * cuts both to its corner (its size and corner come from `className`; any
 * other prop goes to the avatar). The initial always sits underneath and the
 * picture is laid over it, so it shows while the picture loads (from 40 px,
 * the picture's blur shows instead) and wherever it fails. The picture goes through
 * `AOFImage` (next/image), lazily: a stored Avatar as its signed link, which
 * the image server already sized (`unoptimized`: never the App's optimizer);
 * a sign-in provider's (`AUTH.PICTURE_HOSTS`) through the App's optimizer,
 * resized and fetched by the App's server, so the browser never asks the
 * provider. Decoration: the name beside it says who it is.
 */
export const UserAvatar = ({
  blurDataUrl,
  className,
  image,
  name,
  side,
  tone,
  ...props
}: UserAvatarProps) => (
  <AOFAvatar
    aria-hidden
    {...props}
    className={cn(
      "shrink-0 overflow-hidden rounded-md after:hidden",
      className
    )}
  >
    <AOFAvatarFallback className={cn("rounded-none", initial({ tone }))}>
      {name.charAt(0).toUpperCase()}
    </AOFAvatarFallback>
    {image ? (
      <AOFImage
        alt=""
        className="absolute inset-0 size-full object-cover"
        {...tileBlur(blurDataUrl, side)}
        height={side}
        // A new link is a new element: `hideOnError` set `hidden` on the old.
        key={image}
        onError={hideOnError}
        sizes={`${side}px`}
        src={image}
        unoptimized={!fromProvider(image)}
        width={side}
      />
    ) : null}
  </AOFAvatar>
);
