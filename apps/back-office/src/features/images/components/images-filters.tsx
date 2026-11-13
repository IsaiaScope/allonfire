"use client";

import { objectValues } from "@allonfire/core/shared/utils/object";
import { type App, ImageAccess } from "@allonfire/database/enums";
import type { IMAGE } from "@allonfire/storage/features/image/constants/image";
import { AOFFaceted } from "@allonfire/ui/features/data-table/components/aof-faceted";
import { AOFFilterPanel } from "@allonfire/ui/features/data-table/components/aof-filter-panel";
import { AOFButton } from "@allonfire/ui/shared/components/aof-button";
import { cn } from "@allonfire/ui/shared/utils/utils";
import {
  IconFilter2Search,
  IconRefresh,
  IconSearch,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { FilterKanji } from "@/features/users/components/filter-kanji";
import { ActionKanji, kanjiAction } from "@/shared/components/brush-kanji";
import {
  pictogramTile,
  tiledControl,
} from "@/shared/components/toolbar-action";
import { APP_OPTIONS } from "@/shared/constants/apps";
import { IMAGES } from "../constants/images";

export type ImageSearch = ReturnType<typeof IMAGE.SEARCH.parse>;

/**
 * The Images list's Filter button, as the Users list's: its panel holds an
 * App and an Access list (public or private), any number of each, and at its
 * bottom right Clear, which clears both and keeps the words. An empty list is
 * left out of the address by the search's serializer (ADR 0026).
 */
export const ImagesFilters = ({
  search,
  write,
}: {
  search: ImageSearch;
  write: (next: ImageSearch) => void;
}) => {
  const t = useTranslations("Images.filter");
  const tAccess = useTranslations("Images.access");
  const pickApps = useCallback(
    (app: App[]) => write({ ...search, app }),
    [search, write]
  );
  const pickAccess = useCallback(
    (access: ImageAccess[]) => write({ ...search, access }),
    [search, write]
  );
  const reset = useCallback(
    () => write({ text: search.text }),
    [search, write]
  );
  const accesses = objectValues(ImageAccess).map((one) => ({
    label: tAccess(one),
    value: one,
  }));
  const apps = search.app ?? [];
  const chosenAccess = search.access ?? [];
  const count = apps.length + chosenAccess.length;
  const list = {
    add: t("add"),
    clear: t("clear"),
    empty: t("empty"),
    reset: t("reset"),
    search: t("search"),
    selected: (chosen: number) => t("selected", { count: chosen }),
  };
  const tile = (
    <span aria-hidden="true" className={pictogramTile()}>
      <IconSearch />
    </span>
  );
  return (
    <AOFFilterPanel
      action={
        <AOFButton
          className={cn(
            kanjiAction({ tone: "green" }),
            "h-8 min-w-0 gap-1.5 pr-8 pl-3 text-sm"
          )}
          disabled={count === 0}
          onClick={reset}
        >
          <ActionKanji
            className="right-0.5 text-3xl"
            kanji={IMAGES.RESET_KANJI}
          />
          <IconRefresh aria-hidden />
          {t("resetAll")}
        </AOFButton>
      }
      count={count}
      decoration={<FilterKanji />}
      icon={
        <span aria-hidden="true" className={pictogramTile()}>
          <IconFilter2Search />
        </span>
      }
      label={t("button")}
      triggerProps={{
        className: cn(
          tiledControl(),
          "pr-4 pl-1 **:data-[slot=badge]:text-muted-foreground"
        ),
        size: "field",
      }}
    >
      <AOFFaceted
        items={APP_OPTIONS}
        labels={{ ...list, trigger: t("app") }}
        onValueChange={pickApps}
        searchIcon={tile}
        triggerProps={{ className: "px-3", size: "field" }}
        value={apps}
      />
      <AOFFaceted
        items={accesses}
        labels={{ ...list, trigger: t("access") }}
        onValueChange={pickAccess}
        searchIcon={tile}
        triggerProps={{ className: "px-3", size: "field" }}
        value={chosenAccess}
      />
    </AOFFilterPanel>
  );
};
