import { objectValues } from "@allonfire/core/shared/utils/object";
import { App } from "@allonfire/database/enums";
import {
  AOFDataTableSkeleton,
  type AOFDataTableSkeletonColumn,
} from "@allonfire/ui/components/aof-data-table-skeleton";
import { cn } from "@allonfire/ui/lib/utils";
import { cva } from "class-variance-authority";
import { useTranslations } from "next-intl";
import { tiledControl } from "./toolbar-action";

/** The table's columns as the list lays them out: the selection box, the
 *  email (the widest, filling the rest), a Role per App, the date (the
 *  link to the User), at the sizes `useUserColumns` gives them.
 *  The table's browser test checks the count against the real table. */
const COLUMNS: readonly AOFDataTableSkeletonColumn[] = [
  { check: true, track: "48px" },
  { track: "minmax(0,1fr)" },
  ...objectValues(App).map(() => ({ track: "140px" })),
  { track: "140px" },
];

/** Cards a phone gets while it waits: enough to fill its screen. */
const CARDS = 4;

/** A toolbar control's outline: the real controls' edge and ground. */
const control = cva([
  tiledControl(),
  "relative flex items-center gap-2 rounded-lg border pl-1",
]);

/** What stands in for something, pulsing only where motion is welcome. */
const ink = cva("animate-pulse motion-reduce:animate-none", {
  variants: {
    tone: {
      /** Delete, disabled until a row is chosen. */
      destructive: "rounded-lg bg-destructive/10",
      /** A tile or a line of text, as the table's own placeholders. */
      faint: "rounded-sm bg-foreground/10",
      /** Add, the page's primary action. */
      primary: "rounded-lg bg-primary/30",
    },
  },
});

/**
 * The Users list's rows while they load: the table, cards on a phone, and
 * the pager, at the sizes the real ones take.
 */
export const UsersRowsSkeleton = () => {
  const t = useTranslations("Users");
  return (
    <AOFDataTableSkeleton
      cards={CARDS}
      columns={COLUMNS}
      label={t("loading")}
      pager
    />
  );
};

/**
 * The Users list before its rows arrive: the toolbar laid out as the toolbar
 * lays itself out (the search and Filter opening on their tiles, Delete, Add),
 * then the rows. Drawn here rather than with the real toolbar, which reads
 * the address (nuqs) and so would hold the page back with it.
 */
export const UsersListSkeleton = () => (
  <div className="flex min-h-0 flex-1 flex-col gap-3">
    <div aria-hidden className="@container">
      <div className="flex flex-wrap items-center gap-2">
        <div
          className={cn(control(), "min-w-0 flex-1 @4xl:basis-0 basis-full")}
        >
          <div className={cn(ink({ tone: "faint" }), "size-(--field-tile)")} />
          <div className={cn(ink({ tone: "faint" }), "ml-2 h-3.5 w-28")} />
        </div>
        <div className={cn(control(), "w-32")}>
          <div className={cn(ink({ tone: "faint" }), "size-(--field-tile)")} />
          <div className={cn(ink({ tone: "faint" }), "h-3.5 w-12")} />
        </div>
        <div className="ml-auto flex gap-2">
          <div
            className={cn(
              ink({ tone: "destructive" }),
              "size-(--field-height)"
            )}
          />
          <div
            className={cn(
              ink({ tone: "primary" }),
              "h-(--field-height) @4xl:w-40 w-(--field-height)"
            )}
          />
        </div>
      </div>
    </div>
    <UsersRowsSkeleton />
  </div>
);
