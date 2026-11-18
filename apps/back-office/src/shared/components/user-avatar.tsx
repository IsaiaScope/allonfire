import {
  AOFUserAvatar,
  type AOFUserAvatarProps,
} from "@allonfire/ui/features/image/components/aof-user-avatar";
import { cva, type VariantProps } from "class-variance-authority";

/** The initial's tile, in the colour of where it stands: the account's
 *  primary (the sidebar), or the deep line green (the Users list). */
const initial = cva("", {
  defaultVariants: { tone: "line" },
  variants: {
    tone: {
      line: "bg-(--line-green-deep) text-(--line-green-deep-foreground)",
      primary: "bg-primary text-primary-foreground",
    },
  },
});

/** `AOFUserAvatar` in the Back Office's Japan tints. */
export const UserAvatar = ({
  tone,
  ...props
}: Omit<AOFUserAvatarProps, "initialClassName"> &
  VariantProps<typeof initial>) => (
  <AOFUserAvatar initialClassName={initial({ tone })} {...props} />
);
