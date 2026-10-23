import { objectValues } from "@allonfire/core/shared/utils/object";
import { App } from "@allonfire/database/enums";
import { AOFDataTableSkeleton } from "@allonfire/ui/components/aof-data-table-skeleton";
import { useTranslations } from "next-intl";

/** The table's columns: the selection box, the email, a Role per App, the date. */
const COLUMNS = objectValues(App).length + 3;

/**
 * The Users list before its rows arrive: the toolbar's controls in their
 * places (search, the App and Role filters, Add), then the table's own
 * skeleton. Drawn here rather than with the real toolbar, which reads the
 * address (nuqs) and so would hold the page back with it; still, like the
 * frame's placeholders, at the controls' sizes (32px, the filters 144px).
 */
export const UsersListSkeleton = () => {
  const t = useTranslations("Users");
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div
        aria-hidden
        className="flex flex-col gap-2 sm:flex-row sm:items-center"
      >
        <div className="h-8 w-full rounded-lg bg-muted sm:max-w-xs" />
        <div className="flex gap-2">
          <div className="h-8 w-36 rounded-lg bg-muted" />
          <div className="h-8 w-36 rounded-lg bg-muted" />
        </div>
        <div className="h-8 w-24 self-end rounded-lg bg-muted sm:ml-auto sm:self-auto" />
      </div>
      <AOFDataTableSkeleton columns={COLUMNS} label={t("loading")} />
    </div>
  );
};
