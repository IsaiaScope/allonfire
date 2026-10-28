"use client";

import type { UserBody } from "@allonfire/auth/features/users/hono/constants/schemas";
import { DATE } from "@allonfire/core/features/i18n/constants/dates";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { App } from "@allonfire/database/enums";
import { roleIn } from "@allonfire/database/features/auth/access/access";
import { AOFButton } from "@allonfire/ui/components/aof-button";
import { aofColumnHelper } from "@allonfire/ui/components/aof-data-table";
import { AOFTooltip } from "@allonfire/ui/components/aof-tooltip";
import type { ComponentPropsWithoutChildren } from "@allonfire/ui/lib/types";
import { cn } from "@allonfire/ui/lib/utils";
import { IconChevronRight } from "@tabler/icons-react";
import { cva } from "class-variance-authority";
import { useFormatter, useTranslations } from "next-intl";
import {
  type ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "@/features/i18n/navigation";
import { UserAvatar } from "@/shared/components/user-avatar";
import { APP_ENTRY } from "@/shared/constants/apps";
import { USERS } from "../constants/users";
import { userHref } from "../utils/user-href";

const helper = aofColumnHelper<UserBody>();

/** When a User joined, as a day in the page's language. */
export const useCreated = () => {
  const format = useFormatter();
  return useCallback(
    (createdAt: string) =>
      format.dateTime(new Date(createdAt), DATE.FORMAT.DAY),
    [format]
  );
};

/**
 * The email, copied on a click; above the row's link, which covers the rest
 * of the row. Its tip says it copies; after a click, a tap or a key, it opens
 * on its own to say it copied (aloud too) for `USERS.COPIED_MS`, since a touch
 * never hovers.
 */
export const CopyEmail = ({
  className,
  email,
  ...props
}: Omit<ComponentPropsWithoutChildren<typeof AOFButton>, "onClick"> & {
  email: string;
}) => {
  const t = useTranslations("Users.copy");
  // A new object each copy, so a second copy restarts the tip's time.
  const [copy, setCopy] = useState<{ result: "done" | "failed" } | null>(null);
  const copied = copy?.result ?? null;
  const [hovered, setHovered] = useState(false);
  const copyEmail = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopy({ result: "done" });
    } catch {
      setCopy({ result: "failed" });
    }
  }, [email]);
  useEffect(() => {
    if (!copy) {
      return;
    }
    const timer = setTimeout(() => setCopy(null), USERS.COPIED_MS);
    return () => clearTimeout(timer);
  }, [copy]);
  const open = hovered || copied !== null;
  // The words stay as they were while the tip closes, or its fading frame
  // would say "Copy email" again after "Email copied".
  const label = t(copied ?? "tip");
  const [shown, setShown] = useState(label);
  if (open && shown !== label) {
    setShown(label);
  }
  return (
    <>
      <AOFTooltip label={shown} onOpenChange={setHovered} open={open}>
        <AOFButton
          aria-label={t("label", { email })}
          variant="link"
          {...props}
          className={cn(
            "relative z-1 h-auto max-w-full justify-start p-0 text-base text-foreground",
            className
          )}
          onClick={copyEmail}
        >
          <span className="min-w-0 truncate">{email}</span>
        </AOFButton>
      </AOFTooltip>
      <span aria-live="polite" className="sr-only">
        {copied ? t(copied) : null}
      </span>
    </>
  );
};

/** The link's look: a chevron at the card's end, or the row's own date. */
const openLink = cva(
  "rounded-sm outline-none after:absolute after:inset-0 focus-visible:ring-3 focus-visible:ring-ring/50",
  {
    variants: {
      shape: {
        chevron: "ml-auto flex w-fit text-muted-foreground",
        text: "",
      },
    },
  }
);

/**
 * A User's page, as a real link (a new tab included) whose click area
 * stretches over the whole row or card (`after:inset-0`, against the nearest
 * positioned ancestor), so a click anywhere off a control opens it. On a
 * card it is a chevron; in the table it is the row's last text (`children`,
 * the day they joined), so no column is spent on it, and it says aloud whom
 * it opens before that text.
 */
export const OpenUser = ({
  children,
  className,
  user,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & { user: UserBody }) => {
  const t = useTranslations("Users");
  const name = t("open", { email: user.email });
  return children ? (
    <Link
      {...props}
      className={cn(openLink({ shape: "text" }), className)}
      href={userHref(user.id)}
    >
      <span className="sr-only">{name}: </span>
      {children}
    </Link>
  ) : (
    <Link
      aria-label={name}
      {...props}
      className={cn(openLink({ shape: "chevron" }), className)}
      href={userHref(user.id)}
    >
      <IconChevronRight aria-hidden className="size-5" />
    </Link>
  );
};

/**
 * A User in the table: their picture (or initial) beside the email (a click
 * copies it) over their name, muted, when they gave one; the picture 36px,
 * centred beside the two lines (20px each).
 */
const UserIdentity = ({ user }: { user: UserBody }) => (
  <span className="flex min-w-0 items-center gap-2">
    <UserAvatar
      blurDataUrl={user.imageBlurDataUrl}
      className={user.name ? "size-9" : "size-(--field-tile)"}
      image={user.image}
      name={user.name || user.email}
      side={36}
    />
    <span className="flex min-w-0 flex-col">
      <CopyEmail
        className="min-w-0 shrink border-0 leading-5"
        email={user.email}
      />
      {user.name ? (
        <span className="truncate text-muted-foreground text-sm leading-5">
          {user.name}
        </span>
      ) : null}
    </span>
  </span>
);

/** Where a User has no Membership: a dash that says "not a member" aloud. */
export const NoMembership = (props: ComponentPropsWithoutChildren<"span">) => {
  const t = useTranslations("Users");
  return (
    <>
      <span aria-hidden="true" {...props}>
        —
      </span>
      <span className="sr-only">{t("noMembership")}</span>
    </>
  );
};

/** A User's Role in `app`, or `NoMembership`. */
export const RoleIn = ({ app, user }: { app: App; user: UserBody }) => {
  const t = useTranslations("Navigation");
  const role = roleIn(user, app);
  return role ? t(`role.${role}`) : <NoMembership />;
};

/**
 * The email (a click copies it), one column per App, and when they joined,
 * which is the link to the User and covers the row.
 */
export const useUserColumns = () => {
  const t = useTranslations();
  const created = useCreated();
  return useMemo(
    () =>
      helper.columns([
        helper.accessor("email", {
          // The User as on a phone's card: the picture as tall as the email
          // over the name: whole up to 480px when there is room, else cut
          // to an ellipsis down to 240px; the copy and the name aloud stay
          // whole.
          cell: ({ row }) => <UserIdentity user={row.original} />,
          header: t("Users.column.email"),
          maxSize: 480,
          minSize: 240,
        }),
        ...objectValues(App).map((app) =>
          helper.display({
            cell: ({ row }) => <RoleIn app={app} user={row.original} />,
            header: APP_ENTRY[app].name,
            id: app,
          })
        ),
        helper.accessor("createdAt", {
          cell: ({ row }) => (
            <OpenUser user={row.original}>
              {created(row.original.createdAt)}
            </OpenUser>
          ),
          header: t("Users.column.created"),
        }),
      ]),
    [created, t]
  );
};
