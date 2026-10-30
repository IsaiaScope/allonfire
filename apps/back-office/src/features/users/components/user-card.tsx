"use client";

import type { UserBody } from "@allonfire/auth/features/users/hono/constants/schemas";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { App } from "@allonfire/database/enums";
import {
  AOFCard,
  AOFCardContent,
  AOFCardHeader,
  AOFCardTitle,
} from "@allonfire/ui/components/aof-card";
import type { ComponentPropsWithoutChildren } from "@allonfire/ui/lib/types";
import { cn } from "@allonfire/ui/lib/utils";
import { IconCalendar } from "@tabler/icons-react";
import { cva } from "class-variance-authority";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { AppTile } from "@/shared/components/app-tile";
import { BrushKanji } from "@/shared/components/brush-kanji";
import { UserAvatar } from "@/shared/components/user-avatar";
import { APP_ENTRY } from "@/shared/constants/apps";
import { USERS } from "../constants/users";
import { CopyEmail, OpenUser, RoleIn, useCreated } from "./user-columns";

/**
 * The card's selection checkbox, a small tile (24px; its hit area still a
 * finger's): empty while not chosen, filled in the destructive red with a
 * bold check once chosen, since choosing a User is choosing whom to delete
 * (the check AA on it in both themes).
 * Still Base UI's checkbox underneath, so the keyboard and its name hold.
 */
export const cardCheckbox = cva(
  "size-6 rounded-sm bg-muted data-checked:border-destructive data-checked:bg-destructive data-checked:text-white dark:bg-background dark:data-checked:bg-destructive dark:data-checked:text-background **:data-[slot=checkbox-indicator]:[&>svg]:size-3.5 **:data-[slot=checkbox-indicator]:[&>svg]:stroke-3"
);

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
  const created = useCreated();
  return (
    <AOFCard
      className={cn(
        "relative isolate gap-3 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-line/50",
        className
      )}
      size="sm"
      {...props}
    >
      <BrushKanji
        className="-right-10 -bottom-24 -z-10 text-[16rem]"
        kanji={USERS.CARD_KANJI}
        placement="header"
      />
      <AOFCardHeader className="flex min-h-(--field-tile) items-center gap-3">
        {/* As tall as the two lines beside it (20px each and 2px between),
            so its edges meet the email's top and the name's foot. */}
        <UserAvatar
          blurDataUrl={user.imageBlurDataUrl}
          className="size-10.5 text-lg"
          image={user.image}
          name={user.name || user.email}
          side={42}
        />
        <AOFCardTitle className="flex min-w-0 flex-col gap-0.5">
          <CopyEmail
            className="border-0 font-bold leading-5"
            email={user.email}
          />
          {user.name ? (
            <span className="truncate font-normal text-muted-foreground text-sm leading-5">
              {user.name}
            </span>
          ) : null}
        </AOFCardTitle>
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
                <AppTile app={app} size="sm" />
                <span className="truncate">{APP_ENTRY[app].name}</span>
              </dt>
              <dd className="shrink-0">
                <RoleIn app={app} user={user} />
              </dd>
            </div>
          ))}
        </dl>
        <div className="flex min-h-6 items-center gap-3">
          {select}
          <p className="ml-auto flex items-center gap-1.5 text-muted-foreground text-sm">
            <IconCalendar aria-hidden className="size-4" />
            {t("created")} {created(user.createdAt)}
          </p>
        </div>
      </AOFCardContent>
    </AOFCard>
  );
};
