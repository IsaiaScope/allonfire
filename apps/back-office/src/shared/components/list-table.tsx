"use client";

import {
  AOFDataTable,
  type AOFDataTableProps,
  type AOFRow,
} from "@allonfire/ui/features/data-table/components/aof-data-table";
import { AOFDataTablePagination } from "@allonfire/ui/features/data-table/components/aof-data-table-pagination";
import { useCallback } from "react";
import {
  type PaginationWords,
  paginationLabels,
} from "@/shared/utils/pagination-labels";

/**
 * A list's table: the rows under their toolbar (the `children`), the pager
 * below in the page's language (`words`, at the `pageSizes` the list offers),
 * and the rows whose ids are in `deleting` faded while their deletion is on
 * its way.
 */
export const ListTable = <Row extends object>({
  deleting,
  pageSizes,
  table,
  words,
  ...props
}: Omit<AOFDataTableProps<Row>, "busy" | "footer"> & {
  deleting: ReadonlySet<string>;
  pageSizes: readonly number[];
  words: PaginationWords;
}) => {
  const isDeleting = useCallback(
    (row: AOFRow<Row>) => deleting.has(row.id),
    [deleting]
  );
  return (
    <AOFDataTable
      busy={isDeleting}
      footer={
        <AOFDataTablePagination
          labels={paginationLabels(words)}
          pageSizes={pageSizes}
          table={table}
        />
      }
      table={table}
      {...props}
    />
  );
};
