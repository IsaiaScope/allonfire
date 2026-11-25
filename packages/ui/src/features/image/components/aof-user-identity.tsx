import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../../shared/utils/utils";
import { AOFUserAvatar, type AOFUserAvatarProps } from "./aof-user-avatar";

/**
 * The picture's side in CSS pixels beside two lines of 20px: 42 on a card (the
 * lines and the 2px between them), 36 in a table row.
 */
export const AOF_USER_IDENTITY = {
  FACE_PX: { card: 42, row: 36 },
} as const;

const identity = cva("flex min-w-0 items-center", {
  variants: { size: { card: "gap-3", row: "gap-2" } },
});

const face = cva("", {
  variants: { size: { card: "size-10.5", row: "size-9" } },
});

const lines = cva("flex min-w-0 flex-col", {
  variants: { size: { card: "gap-0.5", row: "" } },
});

export type AOFUserIdentityProps = Omit<ComponentProps<"span">, "title"> &
  VariantProps<typeof identity> & {
    /** The picture's props, whole: its `side` is the identity's. */
    avatarProps: Omit<AOFUserAvatarProps, "side">;
    /** The line under the title, muted and cut by an ellipsis. */
    subtitle?: ReactNode;
    /** The first line: a name, an email, a control. */
    title: ReactNode;
  };

/**
 * Who someone is: their picture (or initial) beside a title over a muted
 * subtitle, in the dimensions the Back Office's Users use (a 42px picture on a
 * card, 36px in a table row, a line 20px tall), so every list of people reads
 * alike. It knows no Design: the picture's tint, a badge in the title or a
 * link laid over the row come from the App (`avatarProps`, `title`,
 * `children`).
 */
export const AOFUserIdentity = ({
  avatarProps,
  children,
  className,
  size = "row",
  subtitle,
  title,
  ...props
}: AOFUserIdentityProps) => {
  const side = AOF_USER_IDENTITY.FACE_PX[size ?? "row"];
  return (
    <span {...props} className={cn(identity({ size }), className)}>
      <AOFUserAvatar
        {...avatarProps}
        className={cn(face({ size }), avatarProps.className)}
        side={side}
      />
      <span className={lines({ size })}>
        <span className="flex min-w-0 items-center gap-2 leading-5">
          {title}
        </span>
        {subtitle ? (
          <span className="truncate text-muted-foreground text-sm leading-5">
            {subtitle}
          </span>
        ) : null}
      </span>
      {children}
    </span>
  );
};
