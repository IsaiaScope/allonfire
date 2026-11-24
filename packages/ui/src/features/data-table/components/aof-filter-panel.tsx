"use client";

import { PopoverTitle } from "@allonfire/shadcn/components/popover";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@allonfire/shadcn/components/tabs";
import { useIsMobile } from "@allonfire/shadcn/hooks/use-mobile";
import {
  IconAdjustmentsHorizontal,
  IconFilter,
  IconLayoutColumns,
  IconSortDescendingSmallBig,
} from "@tabler/icons-react";
import { type ReactNode, useCallback, useState } from "react";
import { AOFBadge } from "../../../shared/components/aof-badge";
import { AOFButton } from "../../../shared/components/aof-button";
import {
  AOFPopover,
  AOFPopoverContent,
  AOFPopoverTrigger,
} from "../../../shared/components/aof-popover";
import type { ComponentPropsWithoutChildren } from "../../../shared/types/types";
import { cn } from "../../../shared/utils/utils";

/** Base UI's popover root (`open`, `onOpenChange`, ...), plus the panel. */
export type AOFFilterPanelProps = ComponentPropsWithoutChildren<
  typeof AOFPopover
> & {
  /** Drawn at the panel's bottom left, under every tab: what acts on all of
   *  them at once, such as a Clear all button. Without tabs it is drawn at
   *  the bottom right. */
  action?: ReactNode;
  /** The filters, an `AOFFaceted` each, stacked in the panel. */
  children: ReactNode;
  /** Painted behind everything in the panel and clipped to it (an App's
   *  wall decoration); the panel isolates it, so `-z-10` keeps it under the
   *  panel's own content. */
  decoration?: ReactNode;
  /** How many values the filters hold, counted on the button (and on the Filter tab). */
  count: number;
  /**
   * How many sorts and hidden columns there are, counted on their tabs and,
   * added to `count`, on the button. Only counted while the tabs are drawn.
   */
  counts?: { sort: number; view: number } | undefined;
  /** The button's pictogram; a funnel unless given. */
  icon?: ReactNode;
  /** The button's name and the panel's title. */
  label: string;
  /** The Sort tab's content (`AOFSortPanel`). With `sort` or `view`, and `tabLabels`, the panel has tabs. */
  sort?: ReactNode;
  /** The tabs' names: Filter, Sort and View. Without them the panel has no tabs. */
  tabLabels?: { filter: string; sort: string; view: string } | undefined;
  /** The View tab's content (`AOFViewPanel`). */
  view?: ReactNode;
  /**
   * The table's columns exist only from `md` up (a phone gets cards): the View
   * tab, and the hidden columns in the button's count, are left out below it.
   */
  viewFromMd?: boolean | undefined;
  /** What acts on the open tab alone, drawn at the panel's bottom right while
   *  that tab is open (Clear filters, Reset sorting, Show all). */
  tabActions?: { filter?: ReactNode; sort?: ReactNode; view?: ReactNode };
  /** The Filter button's own props: its classes, its size (`field` beside a
   *  form's fields). */
  triggerProps?: ComponentPropsWithoutChildren<typeof AOFButton>;
};

/** A tab's pictogram: 20px, left out on a phone, where the three names need the room. */
const TAB_ICON = "size-5 max-sm:hidden";

/** A tab at the size of a form's controls: text 16px, icons 20px. */
const TAB =
  "gap-2 text-base text-foreground/80 hover:text-foreground dark:text-foreground/80 dark:hover:text-foreground [&_svg:not([class*='size-'])]:size-5";

/** A tab's pictogram, its name, and how many it holds while that is more than none. */
const TabName = ({
  count,
  icon,
  name,
}: {
  count: number;
  icon: ReactNode;
  name: string;
}) => (
  <>
    {icon}
    {name}
    {count > 0 ? (
      <AOFBadge className="h-5 min-w-5 px-1 tabular-nums" variant="secondary">
        {count}
      </AOFBadge>
    ) : null}
  </>
);

type TabbedProps = {
  action: ReactNode | undefined;
  children: ReactNode;
  count: number;
  counts: AOFFilterPanelProps["counts"];
  label: string;
  sort: ReactNode | undefined;
  tabActions: AOFFilterPanelProps["tabActions"];
  tabLabels: NonNullable<AOFFilterPanelProps["tabLabels"]>;
  view: ReactNode | undefined;
};

/**
 * The panel's body with tabs: the tab bar, the open tab's content, and the
 * footer, `action` at the left and the open tab's own action at the right.
 */
const TabbedBody = ({
  action,
  children,
  count,
  counts,
  sort,
  label,
  tabActions,
  tabLabels,
  view,
}: TabbedProps) => {
  const [tab, setTab] = useState<string>("filter");
  const changeTab = useCallback((next: unknown) => setTab(String(next)), []);
  const own = tabActions?.[tab === "sort" || tab === "view" ? tab : "filter"];
  return (
    <>
      <Tabs onValueChange={changeTab} value={tab}>
        <TabsList
          activateOnFocus
          aria-label={label}
          className="w-full group-data-horizontal/tabs:h-(--field-height)"
        >
          <TabsTrigger className={TAB} value="filter">
            <TabName
              count={count}
              icon={
                <IconAdjustmentsHorizontal aria-hidden className={TAB_ICON} />
              }
              name={tabLabels.filter}
            />
          </TabsTrigger>
          {sort ? (
            <TabsTrigger className={TAB} value="sort">
              <TabName
                count={counts?.sort ?? 0}
                icon={
                  <IconSortDescendingSmallBig
                    aria-hidden
                    className={TAB_ICON}
                  />
                }
                name={tabLabels.sort}
              />
            </TabsTrigger>
          ) : null}
          {view ? (
            <TabsTrigger className={TAB} value="view">
              <TabName
                count={counts?.view ?? 0}
                icon={<IconLayoutColumns aria-hidden className={TAB_ICON} />}
                name={tabLabels.view}
              />
            </TabsTrigger>
          ) : null}
        </TabsList>
        {/* Each panel holds tabbable controls: it is no stop of its own. */}
        <TabsContent tabIndex={-1} value="filter">
          <div className="flex flex-col gap-2 *:w-full">{children}</div>
        </TabsContent>
        {sort ? (
          <TabsContent tabIndex={-1} value="sort">
            {sort}
          </TabsContent>
        ) : null}
        {view ? (
          <TabsContent tabIndex={-1} value="view">
            {view}
          </TabsContent>
        ) : null}
      </Tabs>
      {action || own ? (
        <div className="flex items-center justify-between gap-2 pt-1">
          {action}
          {own}
        </div>
      ) : null}
    </>
  );
};

/**
 * A list's filters behind one Filter button, as tablecn's advanced filter
 * draws them: the button counts the values chosen and opens a panel headed
 * with its title, the filters stacked under it, `action` at the bottom right.
 * With `sort` or `view` (and `tabLabels`) the panel has tabs, Filter, Sort and
 * View, each with a pictogram and its own count, and the button counts all
 * three; `action` (Clear all) stays at the bottom left under every tab and the
 * open tab's own `tabActions` at the bottom right.
 */
export const AOFFilterPanel = ({
  action,
  children,
  count,
  counts,
  decoration,
  icon = <IconFilter aria-hidden />,
  label,
  sort,
  tabActions,
  tabLabels,
  triggerProps,
  view: viewTab,
  viewFromMd,
  ...props
}: AOFFilterPanelProps) => {
  const phone = useIsMobile();
  const view = viewFromMd && phone ? undefined : viewTab;
  const tabbed = tabLabels !== undefined && (sort || view);
  const total = tabbed
    ? count + (counts?.sort ?? 0) + (view ? (counts?.view ?? 0) : 0)
    : count;
  return (
    <AOFPopover {...props}>
      <AOFPopoverTrigger
        render={
          <AOFButton
            variant="outline"
            {...triggerProps}
            className={cn("gap-1.5 font-normal", triggerProps?.className)}
          />
        }
      >
        {icon}
        <span>{label}</span>
        {total > 0 ? (
          <AOFBadge
            className="h-5 min-w-5 px-1 tabular-nums"
            variant="secondary"
          >
            {total}
          </AOFBadge>
        ) : null}
      </AOFPopoverTrigger>
      <AOFPopoverContent
        align="start"
        className="relative isolate w-[min(calc(100vw-var(--gutter-left)-var(--gutter-right)),26rem)] gap-3 overflow-x-hidden p-3 ring-input sm:p-4"
      >
        {/* Clipped to the panel's box: a wall kanji reaches past it, and the
            panel scrolls, so what overflows would make it scroll for nothing. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          {decoration}
        </div>
        <PopoverTitle className="sr-only">{label}</PopoverTitle>
        {tabbed ? (
          <TabbedBody
            action={action}
            count={count}
            counts={counts}
            label={label}
            sort={sort}
            tabActions={tabActions}
            tabLabels={tabLabels}
            view={view}
          >
            {children}
          </TabbedBody>
        ) : (
          <>
            <div className="flex flex-col gap-2 *:w-full">{children}</div>
            {action ? (
              <div className="flex justify-end pt-1">{action}</div>
            ) : null}
          </>
        )}
      </AOFPopoverContent>
    </AOFPopover>
  );
};
