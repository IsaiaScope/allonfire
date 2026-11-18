import {
  AOFUserAvatar,
  type AOFUserAvatarProps,
} from "@allonfire/ui/features/image/components/aof-user-avatar";

/** `AOFUserAvatar` in the Back Office's Japan tints: the deep line green. */
export const UserAvatar = (
  props: Omit<AOFUserAvatarProps, "initialClassName">
) => (
  <AOFUserAvatar
    initialClassName="bg-(--line-green-deep) text-(--line-green-deep-foreground)"
    {...props}
  />
);
