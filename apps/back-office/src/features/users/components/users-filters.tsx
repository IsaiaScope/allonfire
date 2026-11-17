"use client";

import type { USER } from "@allonfire/auth/features/users/constants/users";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { type App, Role } from "@allonfire/database/enums";
import { AOFFaceted } from "@allonfire/ui/features/data-table/components/aof-faceted";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import {
  ListFilterPanel,
  SearchTile,
} from "@/shared/components/list-filter-panel";
import { APP_ENTRY, APP_OPTIONS } from "@/shared/constants/apps";
import { useRangePicker } from "@/shared/hooks/use-range-picker";
import { USERS } from "../constants/users";
import { useUsersView } from "../hooks/use-users-view";

export type UserSearch = ReturnType<typeof USER.SEARCH.parse>;

/**
 * The Users list's Filter button, as the Images list's (`ListFilterPanel`):
 * its Filter tab holds an App and a Role list (any number of each, their
 * triggers trimmed to leave the chosen badges room) and a Created date range;
 * Sort and View read the address through `useUsersView`. Clear clears all
 * three and keeps the words. An empty list is left out of the address by the
 * search's serializer.
 */
export const UsersFilters = ({
  search,
  write,
}: {
  search: UserSearch;
  write: (next: UserSearch) => void;
}) => {
  const t = useTranslations();
  const tColumn = useTranslations("Users.column");
  const view = useUsersView();
  const pickApps = useCallback(
    (app: App[]) => write({ ...search, app }),
    [search, write]
  );
  const pickRoles = useCallback(
    (role: Role[]) => write({ ...search, role }),
    [search, write]
  );
  const pickRange = useRangePicker(search, write);
  const reset = useCallback(
    () => write({ text: search.text }),
    [search, write]
  );
  const roles = objectValues(Role).map((role) => ({
    label: t(`Navigation.role.${role}`),
    value: role,
  }));
  const list = {
    add: t("Users.filter.add"),
    clear: t("Users.search.clear"),
    empty: t("Users.filter.empty"),
    reset: t("Users.filter.reset"),
    search: t("Users.filter.search"),
    selected: (chosen: number) => t("Users.filter.selected", { count: chosen }),
  };
  const apps = search.app ?? [];
  const chosenRoles = search.role ?? [];
  return (
    <ListFilterPanel
      button={t("Users.filter.button")}
      count={apps.length + chosenRoles.length + (search.created ? 1 : 0)}
      hideColumns={USERS.HIDEABLE.map((id) => ({
        id,
        label: id === "created" ? tColumn("created") : APP_ENTRY[id].name,
      }))}
      onRangeChange={pickRange}
      range={search.created ?? null}
      rangeLabel={tColumn("created")}
      resetFilters={reset}
      resetKanji={USERS.RESET_KANJI}
      resetLabel={t("Users.filter.resetAll")}
      sortColumns={USERS.SORTABLE.map((id) => ({
        id,
        label: tColumn(id),
      }))}
      view={view}
    >
      <AOFFaceted
        items={APP_OPTIONS}
        labels={{ ...list, trigger: t("Users.filter.app") }}
        onValueChange={pickApps}
        searchIcon={<SearchTile />}
        triggerProps={{ className: "px-3", size: "field" }}
        value={apps}
      />
      <AOFFaceted
        items={roles}
        labels={{ ...list, trigger: t("Users.filter.role") }}
        onValueChange={pickRoles}
        searchIcon={<SearchTile />}
        triggerProps={{ className: "px-3", size: "field" }}
        value={chosenRoles}
      />
    </ListFilterPanel>
  );
};
