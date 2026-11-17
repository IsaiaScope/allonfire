"use client";

import { SEARCH } from "@allonfire/core/features/search/constants/search";
import type { AOFSorting } from "@allonfire/ui/features/data-table/components/aof-data-table";
import { AOFSortPanel } from "@allonfire/ui/features/data-table/components/aof-sort-panel";
import { AOFViewPanel } from "@allonfire/ui/features/data-table/components/aof-view-panel";
import { IconTrashX } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { ACTION_KANJI } from "@/shared/constants/action-kanji";
import { ActionKanji, kanjiAction } from "./brush-kanji";
import { toolbarActionClass, toolbarActionKanji } from "./toolbar-action";

/** A column as the panels list it: its id and its name. */
export type PanelColumn = { id: string; label: string };

/**
 * A list's Sort tab, in the Back Office's words: it lists the columns the
 * database can sort by, whatever View hides, and reads and writes the
 * address through `sorting` and `onSortingChange` (`useListView`), not the
 * table, which the Filter button sits outside of.
 */
export const ListSortPanel = ({
  columns,
  onSortingChange,
  sorting,
}: {
  columns: readonly PanelColumn[];
  onSortingChange: (next: AOFSorting) => void;
  sorting: AOFSorting;
}) => {
  const t = useTranslations("List.sort");
  const tColumn = useTranslations("List.column");
  return (
    <AOFSortPanel
      addProps={{
        className: kanjiAction(),
        decoration: <ActionKanji kanji={ACTION_KANJI.SORT} />,
        variant: "default",
      }}
      columns={columns}
      dragButton={{
        className: toolbarActionClass("icon", "outline"),
        decoration: (
          <ActionKanji
            className={toolbarActionKanji({ shape: "icon" })}
            kanji={ACTION_KANJI.DRAG}
          />
        ),
      }}
      labels={{
        add: t("add"),
        asc: tColumn("asc"),
        column: t("column"),
        desc: tColumn("desc"),
        direction: t("direction"),
        drag: t("drag"),
        remove: t("remove"),
      }}
      max={SEARCH.SORT.MAX}
      onSortingChange={onSortingChange}
      removeButton={{
        className: toolbarActionClass("icon", "destructive"),
        decoration: (
          <ActionKanji
            className={toolbarActionKanji({ shape: "icon" })}
            kanji={ACTION_KANJI.CLEAR}
          />
        ),
        icon: <IconTrashX aria-hidden />,
      }}
      sorting={sorting}
    />
  );
};

/** A list's View tab, in the Back Office's words: the columns that can hide. */
export const ListViewPanel = ({
  columns,
  hidden,
  onHiddenChange,
  searchIcon,
}: {
  columns: readonly PanelColumn[];
  hidden: readonly string[];
  onHiddenChange: (next: string[]) => void;
  searchIcon: ReactNode;
}) => {
  const t = useTranslations("List.view");
  return (
    <AOFViewPanel
      columns={columns}
      hidden={hidden}
      labels={{
        clear: t("clear"),
        empty: t("empty"),
        search: t("search"),
      }}
      onHiddenChange={onHiddenChange}
      searchIcon={searchIcon}
    />
  );
};
