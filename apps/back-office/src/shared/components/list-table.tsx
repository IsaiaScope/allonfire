"use client";

import {
  AOFDataTable,
  type AOFDataTableProps,
} from "@allonfire/ui/features/data-table/components/aof-data-table";
import { AOFDataTablePagination } from "@allonfire/ui/features/data-table/components/aof-data-table-pagination";
import {
  type PaginationWords,
  paginationLabels,
} from "@allonfire/ui/features/data-table/utils/pagination-labels";

/**
 * A list's table: the rows under their toolbar (the `children`), the pager
 * below in the page's language (`words`, at the `pageSizes` the list offers).
 */
export const ListTable = <Row extends object>({
  pageSizes,
  table,
  words,
  ...props
}: Omit<AOFDataTableProps<Row>, "footer"> & {
  pageSizes: readonly number[];
  words: PaginationWords;
}) => (
  <AOFDataTable
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
