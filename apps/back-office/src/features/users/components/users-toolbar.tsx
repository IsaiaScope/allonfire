"use client";

import { USER } from "@allonfire/auth/features/users/constants/users";
import { IconUserPlus } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";
import { type ReactNode, useCallback } from "react";
import { SearchToolbar } from "@/shared/components/search-toolbar";
import { USERS } from "../constants/users";
import { usersParams } from "../constants/users-params";
import { newUserHref } from "../utils/user-href";
import { UsersFilters } from "./users-filters";

/**
 * The list's controls (`SearchToolbar`): an email search box, then the Filter
 * button (`UsersFilters`), the actions on the selection (`children`), then the
 * primary way to add a User.
 */
export const UsersToolbar = ({ children }: { children?: ReactNode }) => {
  const t = useTranslations("Users");
  const [params, setParams] = useQueryStates(usersParams);
  // Replaces the history entry, and the page key too, which would otherwise push.
  const write = useCallback(
    (search: string | null) =>
      setParams(
        { [USER.PARAM.PAGE]: null, [USER.PARAM.SEARCH]: search },
        USERS.HISTORY.SEARCH
      ),
    [setParams]
  );
  return (
    <SearchToolbar
      add={{
        href: newUserHref(),
        icon: <IconUserPlus aria-hidden />,
        kanji: USERS.ADD_KANJI,
        label: t("add.button"),
      }}
      clearLabel={t("search.clear")}
      codec={USER.SEARCH}
      Filters={UsersFilters}
      raw={params[USER.PARAM.SEARCH]}
      searchLabel={t("search.label")}
      typingRestMs={USERS.TYPING_REST_MS}
      write={write}
    >
      {children}
    </SearchToolbar>
  );
};
