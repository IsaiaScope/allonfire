import {
  AOFAvatar,
  AOFAvatarFallback,
} from "@allonfire/ui/components/aof-avatar";
import { AOFImage } from "@allonfire/ui/components/aof-image";
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

export type UserAvatarProps = ComponentPropsWithoutChildren<typeof AOFAvatar> &
  VariantProps<typeof initial> & {
    /** Their picture's address: a storage path (`/storage/images/...`) or a
     *  provider's URL; none, and only the initial shows. */
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
 * picture is laid over it, so it shows while the picture loads and wherever it fails. The picture goes through
 * `AOFImage` (next/image): one from storage is resized and served as AVIF or
 * WebP by the App's optimizer, lazily; one from a sign-in provider (Google's)
 * loads as it is, since the optimizer only fetches storage paths, and with
 * no referrer, which such hosts can refuse. Decoration: the name beside it
 * says who it is.
 */
export const UserAvatar = ({
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
        height={side}
        referrerPolicy="no-referrer"
        sizes={`${side}px`}
        src={image}
        unoptimized={!image.startsWith("/")}
        width={side}
      />
    ) : null}
  </AOFAvatar>
);
