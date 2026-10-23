"use client";

import {
  USER,
  USER_SEARCH,
} from "@allonfire/auth/features/users/constants/users";
import { PATTERN } from "@allonfire/core/shared/constants/patterns";
import { SEPARATOR } from "@allonfire/core/shared/constants/separators";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { App, Role } from "@allonfire/database/enums";
import { aofButtonVariants } from "@allonfire/ui/components/aof-button";
import { AOFFaceted } from "@allonfire/ui/components/aof-faceted";
import { AOFInput } from "@allonfire/ui/components/aof-input";
import { cn } from "@allonfire/ui/lib/utils";
import { IconPlus } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "@/features/i18n/navigation";
import { APP_ENTRY } from "@/shared/constants/apps";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { USERS } from "../constants/users";
import { usersParams } from "../constants/users-params";

/** The App list's options, in the order the enum declares them. */
const APPS = objectValues(App).map((app) => ({
  label: APP_ENTRY[app].name,
  value: app,
}));

/** Typed text as the address will hold it. */
const tidy = (text: string) =>
  text.trim().split(PATTERN.WHITESPACE).join(SEPARATOR.WORD);

type UserSearch = ReturnType<typeof USER_SEARCH.parse>;

/**
 * The list's controls: an email search box and an App and a Role list,
 * all written into the one `search` param (ADR 0026), any change going back
 * to the first page; on the far right, the primary way to add a User.
 */
export const UsersToolbar = () => {
  const t = useTranslations();
  const [params, setParams] = useQueryStates(usersParams);
  const raw = params[USER.PARAM.SEARCH];
  const search = useMemo(() => USER_SEARCH.parse(raw), [raw]);
  const [draft, setDraft] = useState(search.text);
  // The address changed under the box (Back, a link): the box follows it,
  // unless it already says the same.
  const [seen, setSeen] = useState(search.text);
  if (search.text !== seen) {
    setSeen(search.text);
    if (tidy(draft) !== search.text) {
      setDraft(search.text);
    }
  }

  // Replaces the history entry: Back should not walk through each search.
  // Written for the page key too, which would otherwise push.
  const write = useCallback(
    (next: UserSearch) =>
      setParams(
        {
          [USER.PARAM.PAGE]: null,
          [USER.PARAM.SEARCH]: USER_SEARCH.serialize(next) || null,
        },
        USERS.HISTORY.SEARCH
      ),
    [setParams]
  );

  useEffect(() => {
    if (tidy(draft) === search.text) {
      return;
    }
    // A field typed in the box (`app:laura`) becomes its filter, and the
    // box keeps only the words.
    const timer = setTimeout(() => {
      const typed = USER_SEARCH.parse(draft);
      write({ ...search, ...typed });
      setDraft(typed.text);
    }, USERS.TYPING_REST_MS);
    return () => clearTimeout(timer);
  }, [draft, search, write]);

  const type = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setDraft(event.target.value),
    []
  );
  // An unset field is left out of the address by the search's serializer.
  const pickApp = useCallback(
    (app: App | null) => write({ ...search, app: app ?? undefined }),
    [search, write]
  );
  const pickRole = useCallback(
    (role: Role | null) => write({ ...search, role: role ?? undefined }),
    [search, write]
  );

  const roles = objectValues(Role).map((role) => ({
    label: t(`Navigation.role.${role}`),
    value: role,
  }));
  const shared = {
    empty: t("Users.filter.empty"),
    reset: t("Users.filter.reset"),
    search: t("Users.filter.search"),
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <AOFInput
        aria-label={t("Users.search.label")}
        className="sm:max-w-xs"
        onChange={type}
        placeholder={t("Users.search.label")}
        type="search"
        value={draft}
      />
      <div className="flex gap-2">
        <AOFFaceted
          items={APPS}
          labels={{
            ...shared,
            placeholder: t("Users.filter.anyApp"),
            trigger: t("Users.filter.app"),
          }}
          onValueChange={pickApp}
          value={search.app ?? null}
        />
        <AOFFaceted
          items={roles}
          labels={{
            ...shared,
            placeholder: t("Users.filter.anyRole"),
            trigger: t("Users.filter.role"),
          }}
          onValueChange={pickRole}
          value={search.role ?? null}
        />
      </div>
      {/* A link drawn as the primary button: it navigates, and opens in a
          new tab too. */}
      <Link
        className={cn(aofButtonVariants(), "self-end sm:ml-auto sm:self-auto")}
        href={`${BACK_OFFICE.PAGE.USERS}${USERS.PATH.NEW}`}
      >
        <IconPlus />
        {t("Users.add.button")}
      </Link>
    </div>
  );
};
