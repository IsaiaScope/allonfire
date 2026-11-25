"use client";

import { objectValues } from "@allonfire/core/shared/utils/object";
import { type App, ImageAccess } from "@allonfire/database/enums";
import { APP } from "@allonfire/design/apps/app";
import type { IMAGE } from "@allonfire/storage/features/image/constants/image";
import { AOFFaceted } from "@allonfire/ui/features/data-table/components/aof-faceted";
import { useRangePicker } from "@allonfire/ui/features/data-table/hooks/use-range-picker";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import {
  ListFilterPanel,
  SearchTile,
} from "@/shared/components/list-filter-panel";
import { IMAGES } from "../constants/images";
import { useImagesView } from "../hooks/use-images-view";

export type ImageSearch = ReturnType<typeof IMAGE.SEARCH.parse>;

/**
 * The Images list's Filter button, as the Users list's (`ListFilterPanel`):
 * its Filter tab holds an App and an Access list (public or private), any
 * number of each, and a Created date range; Sort and View read the address
 * through `useImagesView`. Clear clears all three and keeps the words. An
 * empty list is left out of the address by the search's serializer (ADR 0026).
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
  const tColumn = useTranslations("Images.column");
  const view = useImagesView();
  const pickApps = useCallback(
    (app: App[]) => write({ ...search, app }),
    [search, write]
  );
  const pickAccess = useCallback(
    (access: ImageAccess[]) => write({ ...search, access }),
    [search, write]
  );
  const pickRange = useRangePicker(search, write);
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
  const list = {
    add: t("add"),
    clear: t("clear"),
    empty: t("empty"),
    reset: t("reset"),
    search: t("search"),
    selected: (chosen: number) => t("selected", { count: chosen }),
  };
  return (
    <ListFilterPanel
      button={t("button")}
      count={apps.length + chosenAccess.length + (search.created ? 1 : 0)}
      hideColumns={IMAGES.HIDEABLE.map((id) => ({
        id,
        label: tColumn(id),
      }))}
      onRangeChange={pickRange}
      range={search.created ?? null}
      rangeLabel={tColumn("created")}
      resetFilters={reset}
      resetKanji={IMAGES.KANJI.RESET}
      resetLabel={t("resetAll")}
      sortColumns={IMAGES.SORTABLE.map((id) => ({
        id,
        label: tColumn(id),
      }))}
      view={view}
    >
      <AOFFaceted
        items={APP.OPTIONS}
        labels={{ ...list, trigger: t("app") }}
        onValueChange={pickApps}
        searchIcon={<SearchTile />}
        triggerProps={{ className: "px-3", size: "field" }}
        value={apps}
      />
      <AOFFaceted
        items={accesses}
        labels={{ ...list, trigger: t("access") }}
        onValueChange={pickAccess}
        searchIcon={<SearchTile />}
        triggerProps={{ className: "px-3", size: "field" }}
        value={chosenAccess}
      />
    </ListFilterPanel>
  );
};
