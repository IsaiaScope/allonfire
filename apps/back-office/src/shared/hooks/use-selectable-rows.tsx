import type {
  AOFRow,
  useAOFTable,
} from "@allonfire/ui/features/data-table/components/aof-data-table";
import {
  AOFRowCheckbox,
  aofSelectColumn,
} from "@allonfire/ui/features/data-table/components/aof-data-table-select";
import { type ReactNode, useCallback, useMemo } from "react";
import { cardCheckbox } from "@/shared/utils/card-checkbox";

/**
 * A list's columns with a selection box first, and each row's card on a
 * phone with its own box at the top. The list gives its own `columns`, its
 * `card` (drawn around the `select` box it is handed, `null` for a row that
 * cannot be selected), and the words aloud of the boxes (`all`, and `label`
 * of a row, memoised by the list).
 */
export const useSelectableRows = <Row extends object>({
  all,
  card,
  columns,
  label,
}: {
  all: string;
  card: (row: AOFRow<Row>, select: ReactNode) => ReactNode;
  columns: Parameters<typeof useAOFTable<Row>>[0]["columns"];
  label: (row: AOFRow<Row>) => string;
}) => {
  const withSelect = useMemo(
    () => [aofSelectColumn<Row>({ all, row: label }), ...columns],
    [all, columns, label]
  );
  const rowCard = useCallback(
    (row: AOFRow<Row>) =>
      card(
        row,
        row.getCanSelect() ? (
          <AOFRowCheckbox
            className={cardCheckbox()}
            label={label(row)}
            row={row}
          />
        ) : null
      ),
    [card, label]
  );
  return { card: rowCard, columns: withSelect };
};
