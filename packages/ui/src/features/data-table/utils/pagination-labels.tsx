import type { ReactNode } from "react";
import type { AOFDataTableLabels } from "../components/aof-data-table-pagination";

/** A feature's `pagination` words, as its `useTranslations("<Feature>.pagination")` reads them. */
export type PaginationWords = {
  (key: "first" | "last" | "next" | "previous" | "rowsPerPage"): string;
  rich: (
    key: "page",
    values: {
      n: (chunks: ReactNode) => ReactNode;
      page: number;
      pageCount: number;
    }
  ) => ReactNode;
};

/** A list footer's words, in the page's language. */
export const paginationLabels = (t: PaginationWords): AOFDataTableLabels => ({
  first: t("first"),
  last: t("last"),
  next: t("next"),
  page: (page, pageCount) =>
    t.rich("page", {
      n: (number) => <span className="text-foreground">{number}</span>,
      page,
      pageCount,
    }),
  previous: t("previous"),
  rowsPerPage: t("rowsPerPage"),
});
