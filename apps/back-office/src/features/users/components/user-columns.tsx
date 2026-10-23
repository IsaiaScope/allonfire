"use client";

import type { UserBody } from "@allonfire/auth/features/users/hono/constants/schemas";
import { DATE } from "@allonfire/core/features/i18n/constants/dates";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { App } from "@allonfire/database/enums";
import {
  AOFCard,
  AOFCardContent,
  AOFCardHeader,
  AOFCardTitle,
} from "@allonfire/ui/components/aof-card";
import { aofColumnHelper } from "@allonfire/ui/components/aof-data-table";
import { useFormatter, useTranslations } from "next-intl";
import { type ReactNode, useCallback, useMemo } from "react";
import { Link } from "@/features/i18n/navigation";
import { APP_ENTRY } from "@/shared/constants/apps";
import { BACK_OFFICE } from "@/shared/constants/back-office";

const helper = aofColumnHelper<UserBody>();

/** A User's own page. */
export const userHref = (id: string) => `${BACK_OFFICE.PAGE.USERS}/${id}`;

/** When a User joined, as a day in the page's language. */
const useCreated = () => {
  const format = useFormatter();
  return useCallback(
    (createdAt: string) =>
      format.dateTime(new Date(createdAt), DATE.FORMAT.DAY),
    [format]
  );
};

/** A User's Role in `app`, or a dash that says "not a member" aloud. */
const RoleIn = ({ app, user }: { app: App; user: UserBody }) => {
  const t = useTranslations();
  const membership = user.memberships.find(
    (candidate) => candidate.app === app
  );
  return membership ? (
    t(`Navigation.role.${membership.role}`)
  ) : (
    <>
      <span aria-hidden="true">—</span>
      <span className="sr-only">{t("Users.noMembership")}</span>
    </>
  );
};

/** The email (a link to the User), one column per App, and when they joined. */
export const useUserColumns = () => {
  const t = useTranslations();
  const created = useCreated();
  return useMemo(
    () =>
      helper.columns([
        helper.accessor("email", {
          cell: ({ row }) => (
            <Link
              className="font-medium underline-offset-4 hover:underline"
              href={userHref(row.original.id)}
            >
              {row.original.email}
            </Link>
          ),
          header: t("Users.column.email"),
        }),
        ...objectValues(App).map((app) =>
          helper.display({
            cell: ({ row }) => <RoleIn app={app} user={row.original} />,
            header: APP_ENTRY[app].name,
            id: app,
          })
        ),
        helper.accessor("createdAt", {
          cell: ({ row }) => created(row.original.createdAt),
          header: t("Users.column.created"),
        }),
      ]),
    [created, t]
  );
};

/**
 * A User on a phone: the email, each App they are in with their Role, and
 * when they joined; `select` is their selection checkbox, when they can be
 * selected.
 */
export const UserCard = ({
  select,
  user,
}: {
  select?: ReactNode;
  user: UserBody;
}) => {
  const t = useTranslations();
  const created = useCreated();
  return (
    <AOFCard size="sm">
      <AOFCardHeader className="flex items-center gap-3">
        {select}
        <AOFCardTitle className="min-w-0 truncate">
          <Link href={userHref(user.id)}>{user.email}</Link>
        </AOFCardTitle>
      </AOFCardHeader>
      <AOFCardContent className="flex flex-col gap-1 text-muted-foreground text-sm">
        {user.memberships.map(({ app, role }) => (
          <span key={app}>
            {APP_ENTRY[app].name} · {t(`Navigation.role.${role}`)}
          </span>
        ))}
        <span>
          {t("Users.column.created")} {created(user.createdAt)}
        </span>
      </AOFCardContent>
    </AOFCard>
  );
};
