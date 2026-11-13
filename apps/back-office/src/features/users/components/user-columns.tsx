"use client";

import type { UserBody } from "@allonfire/auth/features/users/hono/constants/schemas";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { App, Role } from "@allonfire/database/enums";
import { roleIn } from "@allonfire/database/features/auth/access/access";
import { aofColumnHelper } from "@allonfire/ui/features/data-table/components/aof-data-table";
import { useAOFIntentPrefetch } from "@allonfire/ui/features/query/hooks/use-aof-intent-prefetch";
import { AOFBadge } from "@allonfire/ui/shared/components/aof-badge";
import { cn } from "@allonfire/ui/shared/utils/utils";
import { IconBarrierBlockOff, IconChevronRight } from "@tabler/icons-react";
import { cva } from "class-variance-authority";
import { useTranslations } from "next-intl";
import { type ComponentProps, useMemo } from "react";
import { Link } from "@/features/i18n/navigation";
import { CopyText } from "@/shared/components/copy-text";
import { UserAvatar } from "@/shared/components/user-avatar";
import { APP_ENTRY } from "@/shared/constants/apps";
import { useCreated } from "@/shared/utils/use-created";
import { userHref } from "../utils/user-href";

const helper = aofColumnHelper<UserBody>();

/** The email, copied on a click (`CopyText`, in Users' words). */
export const CopyEmail = ({
  email,
  ...props
}: Omit<ComponentProps<typeof CopyText>, "labels" | "value"> & {
  email: string;
}) => {
  const t = useTranslations("Users.copy");
  return (
    <CopyText
      {...props}
      labels={{
        done: t("done"),
        failed: t("failed"),
        label: t("label", { email }),
        tip: t("tip"),
      }}
      value={email}
    />
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
 * it opens before that text. It prefetches the User's page, their data
 * included, only once reached for: hover, focus, or a finger landing.
 */
export const OpenUser = ({
  children,
  className,
  user,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & { user: UserBody }) => {
  const t = useTranslations("Users");
  const name = t("open", { email: user.email });
  // Intent, not viewport: a page holds up to 100 rows and each prefetch is
  // a server read (ADR 0028).
  const intent = useAOFIntentPrefetch();
  return children ? (
    <Link
      {...props}
      {...intent}
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
      {...intent}
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

/** Where a User has no Membership: a closed barrier that says "not a member"
 *  aloud. */
const NoMembership = () => {
  const t = useTranslations("Users");
  return (
    <>
      <span aria-hidden="true" className="inline-flex text-muted-foreground">
        <IconBarrierBlockOff className="size-5" />
      </span>
      <span className="sr-only">{t("noMembership")}</span>
    </>
  );
};

/** A Role's chip, louder the more it allows: Admin in the primary, User
 *  filled quietly, Viewer outlined. */
const ROLE_BADGE = {
  [Role.ADMIN]: "default",
  [Role.USER]: "secondary",
  [Role.VIEWER]: "outline",
} as const satisfies Record<Role, "default" | "outline" | "secondary">;

/** A User's Role in `app` on its chip, or `NoMembership`: the table's cell
 *  and the phone's card alike. */
export const RoleIn = ({ app, user }: { app: App; user: UserBody }) => {
  const t = useTranslations("Navigation");
  const role = roleIn(user, app);
  return role ? (
    <AOFBadge className="h-6 px-2 text-sm" variant={ROLE_BADGE[role]}>
      {t(`role.${role}`)}
    </AOFBadge>
  ) : (
    <NoMembership />
  );
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
            // Chip, barrier and heading centred in the column.
            cell: ({ row }) => (
              <div className="text-center">
                <RoleIn app={app} user={row.original} />
              </div>
            ),
            header: () => (
              <div className="text-center">{APP_ENTRY[app].name}</div>
            ),
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
