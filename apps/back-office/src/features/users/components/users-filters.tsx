"use client";

import type { USER_SEARCH } from "@allonfire/auth/features/users/constants/users";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { App, Role } from "@allonfire/database/enums";
import { AOFButton } from "@allonfire/ui/components/aof-button";
import { AOFFaceted } from "@allonfire/ui/components/aof-faceted";
import { AOFFilterPanel } from "@allonfire/ui/components/aof-filter-panel";
import { cn } from "@allonfire/ui/lib/utils";
import {
  IconFilter2Search,
  IconRefresh,
  IconSearch,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { ActionKanji, kanjiAction } from "@/shared/components/brush-kanji";
import { APP_ENTRY } from "@/shared/constants/apps";
import { USERS } from "../constants/users";
import { FilterKanji } from "./filter-kanji";
import { pictogramTile, tiledControl } from "./toolbar-action";

/** The App list's options, in the order the enum declares them. */
const APPS = objectValues(App).map((app) => ({
  label: APP_ENTRY[app].name,
  value: app,
}));

export type UserSearch = ReturnType<typeof USER_SEARCH.parse>;

/**
 * The Users list's Filter button, opening on the toolbar's pictogram tile,
 * its name and count muted like the search box's placeholder:
 * its panel holds an App and a Role list (any number of each, their
 * triggers trimmed to leave the chosen badges room), and at its bottom right
 * Clear, a small kanji button in the line's deep green, which clears both
 * and keeps the words. An empty list is left out of the address by the search's
 * serializer.
 */
export const UsersFilters = ({
  search,
  write,
}: {
  search: UserSearch;
  write: (next: UserSearch) => void;
}) => {
  const t = useTranslations();
  const pickApps = useCallback(
    (app: App[]) => write({ ...search, app }),
    [search, write]
  );
  const pickRoles = useCallback(
    (role: Role[]) => write({ ...search, role }),
    [search, write]
  );
  const reset = useCallback(
    () => write({ text: search.text }),
    [search, write]
  );
  const roles = objectValues(Role).map((role) => ({
    label: t(`Navigation.role.${role}`),
    value: role,
  }));
  const list = {
    clear: t("Users.search.clear"),
    empty: t("Users.filter.empty"),
    reset: t("Users.filter.reset"),
    search: t("Users.filter.search"),
    selected: (chosen: number) => t("Users.filter.selected", { count: chosen }),
  };
  // Each list's search box opens on the same tile as the page's search.
  const tile = (
    <span aria-hidden="true" className={pictogramTile()}>
      <IconSearch />
    </span>
  );
  const apps = search.app ?? [];
  const chosenRoles = search.role ?? [];
  const count = apps.length + chosenRoles.length;
  return (
    <AOFFilterPanel
      action={
        <AOFButton
          // The line's deep green: white on it reads 5.2:1 (theme.test.ts).
          className={cn(
            kanjiAction(),
            "h-8 min-w-0 gap-1.5 bg-(--line-green-deep) pr-8 pl-3 text-(--line-green-deep-foreground) text-sm hover:bg-(--line-green-deep)/90"
          )}
          disabled={count === 0}
          onClick={reset}
        >
          <ActionKanji
            className="right-0.5 text-3xl"
            kanji={USERS.RESET_KANJI}
          />
          <IconRefresh aria-hidden />
          {t("Users.filter.resetAll")}
        </AOFButton>
      }
      count={count}
      decoration={<FilterKanji />}
      icon={
        <span aria-hidden="true" className={pictogramTile()}>
          <IconFilter2Search />
        </span>
      }
      label={t("Users.filter.button")}
      triggerProps={{
        className: cn(
          tiledControl(),
          "pr-4 pl-1 **:data-[slot=badge]:text-muted-foreground"
        ),
        size: "field",
      }}
    >
      <AOFFaceted
        items={APPS}
        labels={{ ...list, trigger: t("Users.filter.app") }}
        onValueChange={pickApps}
        searchIcon={tile}
        triggerProps={{ className: "px-3", size: "field" }}
        value={apps}
      />
      <AOFFaceted
        items={roles}
        labels={{ ...list, trigger: t("Users.filter.role") }}
        onValueChange={pickRoles}
        searchIcon={tile}
        triggerProps={{ className: "px-3", size: "field" }}
        value={chosenRoles}
      />
    </AOFFilterPanel>
  );
};
