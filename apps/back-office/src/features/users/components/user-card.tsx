"use client";

import type { UserBody } from "@allonfire/auth/features/users/hono/constants/schemas";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { App } from "@allonfire/database/enums";
import { APP } from "@allonfire/design/apps/app";
import { AOFAppTile } from "@allonfire/ui/features/navigation/components/aof-app-tile";
import {
  type AOFCard,
  AOFCardContent,
  AOFCardHeader,
} from "@allonfire/ui/shared/components/aof-card";
import type { ComponentPropsWithoutChildren } from "@allonfire/ui/shared/types/types";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { SignCard, SignCardFoot } from "@/shared/components/sign-card";
import { UserIdentity } from "@/shared/components/user-identity";
import { USERS } from "../constants/users";
import { CopyEmail, OpenUser, RoleIn } from "./user-columns";

/**
 * A User on a phone, as a platform sign: the line's colour along its foot and
 * 乗 brushed large and faint behind, cut by its corner; their
 * picture (or initial), the email (a click copies it) over their name, and the
 * way to their page; then every App with its mark and their Role there on a
 * chip, in the table's order; last, their selection checkbox (`select`, when
 * they can be selected) at the left and when they joined at the right. A tap
 * anywhere off a control opens the User.
 */
export type UserCardProps = ComponentPropsWithoutChildren<typeof AOFCard> & {
  /** Their selection checkbox, when they can be selected. */
  select?: ReactNode;
  user: UserBody;
};

export const UserCard = ({
  className,
  select,
  user,
  ...props
}: UserCardProps) => {
  const t = useTranslations("Users.column");
  return (
    <SignCard className={className} kanji={USERS.KANJI.CARD} {...props}>
      <AOFCardHeader className="flex min-h-(--field-tile) items-center gap-3">
        <UserIdentity
          avatarProps={{
            blurDataUrl: user.imageBlurDataUrl,
            className: "text-lg",
            image: user.image,
            name: user.name || user.email,
          }}
          className="min-w-0 flex-1"
          size="card"
          subtitle={user.name}
          title={
            <CopyEmail
              className="border-0 font-bold leading-5"
              email={user.email}
            />
          }
        />
        <OpenUser user={user} />
      </AOFCardHeader>
      <AOFCardContent className="flex flex-col gap-3">
        <dl className="flex flex-col divide-y rounded-md border bg-card/80">
          {objectValues(App).map((app) => (
            <div
              className="flex min-h-10 items-center justify-between gap-3 px-2 py-1.5"
              key={app}
            >
              <dt className="flex min-w-0 items-center gap-2 text-base">
                <AOFAppTile entry={APP.ENTRY[app]} size="sm" />
                <span className="truncate">{APP.ENTRY[app].name}</span>
              </dt>
              <dd className="shrink-0">
                <RoleIn app={app} user={user} />
              </dd>
            </div>
          ))}
        </dl>
        <SignCardFoot
          createdAt={user.createdAt}
          label={t("created")}
          select={select}
        />
      </AOFCardContent>
    </SignCard>
  );
};
