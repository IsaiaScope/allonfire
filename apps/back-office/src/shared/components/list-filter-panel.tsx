"use client";

import type { DayRange } from "@allonfire/core/features/search/utc-day-range";
import type { AOFSorting } from "@allonfire/ui/features/data-table/components/aof-data-table";
import { AOFDateRangeFilter } from "@allonfire/ui/features/data-table/components/aof-date-range-filter";
import { AOFFilterPanel } from "@allonfire/ui/features/data-table/components/aof-filter-panel";
import { AOFButton } from "@allonfire/ui/shared/components/aof-button";
import { cn } from "@allonfire/ui/shared/utils/utils";
import {
  IconArrowBackUp,
  IconEye,
  IconFilter2Search,
  IconFilterOff,
  IconRefresh,
  IconSearch,
} from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useCallback } from "react";
import { ActionKanji, kanjiAction } from "@/shared/components/brush-kanji";
import { FilterKanji } from "@/shared/components/filter-kanji";
import {
  ListSortPanel,
  ListViewPanel,
  type PanelColumn,
} from "@/shared/components/list-panels";
import {
  pictogramTile,
  tiledControl,
} from "@/shared/components/toolbar-action";
import { ACTION_KANJI } from "@/shared/constants/action-kanji";
import { useDayFormat } from "@/shared/hooks/use-day-format";

/** The tile a filter list's search box opens on, the same as the page's search. */
export const SearchTile = () => (
  <span aria-hidden="true" className={pictogramTile()}>
    <IconSearch />
  </span>
);

/**
 * One of the panel's clear buttons: a step under a field's height, with a
 * small kanji brushed at its end;
 * the green one clears what the open tab holds, the red one (`destructive`)
 * clears everything.
 */
const ClearButton = ({
  destructive = false,
  disabled,
  icon,
  kanji,
  label,
  onClick,
}: {
  destructive?: boolean;
  disabled: boolean;
  icon?: ReactNode;
  kanji: string;
  label: string;
  onClick: () => void;
}) => (
  <AOFButton
    className={cn(
      destructive ? kanjiAction() : kanjiAction({ tone: "green" }),
      "h-8 min-w-0 gap-1.5 pr-8 pl-3 text-sm"
    )}
    disabled={disabled}
    onClick={onClick}
    variant={destructive ? "destructive" : "default"}
  >
    <ActionKanji className="right-0.5 text-3xl" kanji={kanji} />
    {icon}
    {label}
  </AOFButton>
);

/**
 * A list's Filter button with its three tabs (ADR 0031): Filter holds the
 * list's own filters (`children`) and a date range, Sort and View read and
 * write the address through `view` (`useListView`). At the bottom right Clear
 * clears the filters (`resetFilters`, which keeps the words), the sort and the
 * hidden columns together; the button counts all of them. The panel opens on
 * the toolbar's pictogram tile, its name and count muted like the search
 * box's placeholder.
 */
export const ListFilterPanel = ({
  button,
  children,
  count,
  hideColumns,
  onRangeChange,
  range,
  rangeLabel,
  resetFilters,
  resetKanji,
  resetLabel,
  sortColumns,
  view,
}: {
  /** The button's name and the panel's title. */
  button: string;
  /** The list's own filters, a faceted list each. */
  children: ReactNode;
  /** How many values its filters hold, the range included. */
  count: number;
  hideColumns: readonly PanelColumn[];
  onRangeChange: (next: DayRange | null) => void;
  range: DayRange | null;
  /** The date range's name: the column it filters. */
  rangeLabel: string;
  /** Clears the list's filters and the range, keeping the words. */
  resetFilters: () => void;
  resetKanji: string;
  resetLabel: string;
  sortColumns: readonly PanelColumn[];
  view: {
    hidden: readonly string[];
    onHiddenChange: (next: string[]) => void;
    onSortingChange: (next: AOFSorting) => void;
    resetView: () => void;
    sorting: AOFSorting;
  };
}) => {
  const t = useTranslations("List");
  const language = useLocale();
  const formatDay = useDayFormat();
  const { hidden, onHiddenChange, onSortingChange, resetView, sorting } = view;
  // The filters write the first page; with none set, a View-only reset must
  // leave the page and the selection as they are (ADR 0031).
  const reset = useCallback(() => {
    if (count > 0) {
      resetFilters();
    }
    resetView();
  }, [count, resetFilters, resetView]);
  const clearSort = useCallback(() => onSortingChange([]), [onSortingChange]);
  const showAll = useCallback(() => onHiddenChange([]), [onHiddenChange]);
  const total = count + sorting.length + hidden.length;
  return (
    <AOFFilterPanel
      action={
        <ClearButton
          destructive
          disabled={total === 0}
          icon={<IconRefresh aria-hidden />}
          kanji={ACTION_KANJI.CLEAR}
          label={resetLabel}
          onClick={reset}
        />
      }
      count={count}
      counts={{ sort: sorting.length, view: hidden.length }}
      decoration={<FilterKanji />}
      icon={
        <span aria-hidden="true" className={pictogramTile()}>
          <IconFilter2Search />
        </span>
      }
      label={button}
      sort={
        <ListSortPanel
          columns={sortColumns}
          onSortingChange={onSortingChange}
          sorting={sorting}
        />
      }
      tabActions={{
        filter: (
          <ClearButton
            disabled={count === 0}
            icon={<IconFilterOff aria-hidden />}
            kanji={resetKanji}
            label={t("clear.filters")}
            onClick={resetFilters}
          />
        ),
        sort: (
          <ClearButton
            disabled={sorting.length === 0}
            icon={<IconArrowBackUp aria-hidden />}
            kanji={resetKanji}
            label={t("sort.reset")}
            onClick={clearSort}
          />
        ),
        view: (
          <ClearButton
            disabled={hidden.length === 0}
            icon={<IconEye aria-hidden />}
            kanji={resetKanji}
            label={t("view.showAll")}
            onClick={showAll}
          />
        ),
      }}
      tabLabels={{
        filter: t("tab.filter"),
        sort: t("tab.sort"),
        view: t("tab.view"),
      }}
      triggerProps={{
        className: cn(
          tiledControl(),
          "pr-4 pl-1 **:data-[slot=badge]:text-muted-foreground"
        ),
        size: "field",
      }}
      view={
        <ListViewPanel
          columns={hideColumns}
          hidden={hidden}
          onHiddenChange={onHiddenChange}
          searchIcon={<SearchTile />}
        />
      }
    >
      {children}
      <AOFDateRangeFilter
        format={formatDay}
        label={rangeLabel}
        labels={{ clear: t("range.clear") }}
        language={language}
        onValueChange={onRangeChange}
        triggerProps={{ className: "px-3", size: "field" }}
        value={range}
      />
    </AOFFilterPanel>
  );
};
