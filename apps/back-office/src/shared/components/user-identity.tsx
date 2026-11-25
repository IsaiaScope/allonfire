import {
  AOFUserIdentity,
  type AOFUserIdentityProps,
} from "@allonfire/ui/features/image/components/aof-user-identity";

/** `AOFUserIdentity` in the Back Office's Japan tint: a person's picture beside their lines. */
export const UserIdentity = ({
  avatarProps,
  ...props
}: Omit<AOFUserIdentityProps, "avatarProps"> & {
  avatarProps: Omit<AOFUserIdentityProps["avatarProps"], "initialClassName">;
}) => (
  <AOFUserIdentity
    avatarProps={{
      // The Japan Design's tint for an initial: the deep line green.
      initialClassName:
        "bg-(--line-green-deep) text-(--line-green-deep-foreground)",
      ...avatarProps,
    }}
    {...props}
  />
);
