import { SEARCH } from "@allonfire/core/features/search/constants/search";
import {
  type AOFColumnVisibility,
  type AOFSorting,
  useAOFTable,
} from "@allonfire/ui/features/data-table/components/aof-data-table";
import type { useRowSelection } from "@/shared/hooks/use-row-selection";
import type {
  TablePagination,
  TablePaginationUpdater,
} from "@/shared/utils/table-pagination";

/** What a list's table state hook gives the table (`useImagesTableState`, `useUsersTableState`). */
type ListTableState = Pick<
  ReturnType<typeof useRowSelection>,
  "selection" | "setSelection"
> & {
  columnVisibility: AOFColumnVisibility;
  onColumnVisibilityChange: NonNullable<
    Parameters<typeof useAOFTable>[0]["onColumnVisibilityChange"]
  >;
  onPaginationChange: (updater: TablePaginationUpdater) => void;
  onSortingChange: NonNullable<
    Parameters<typeof useAOFTable>[0]["onSortingChange"]
  >;
  pagination: TablePagination;
  sorting: AOFSorting;
};

/**
 * A Back Office list's table: the rows the API sent, paged and sorted by the
 * API (`manualPagination`, the database sorts), at most `SEARCH.SORT.MAX`
 * sorts, the page, the sort, the hidden columns and the selection all read
 * from and written to the list's own state.
 */
export const useListTable = <TData extends object>({
  state,
  ...options
}: Pick<
  Parameters<typeof useAOFTable<TData>>[0],
  "columns" | "data" | "enableRowSelection" | "getRowId" | "pageCount"
> & { state: ListTableState }) =>
  useAOFTable<TData>({
    ...options,
    manualPagination: true,
    maxMultiSortColCount: SEARCH.SORT.MAX,
    onColumnVisibilityChange: state.onColumnVisibilityChange,
    onPaginationChange: state.onPaginationChange,
    onRowSelectionChange: state.setSelection,
    onSortingChange: state.onSortingChange,
    state: {
      columnVisibility: state.columnVisibility,
      pagination: state.pagination,
      rowSelection: state.selection,
      sorting: state.sorting,
    },
  });
