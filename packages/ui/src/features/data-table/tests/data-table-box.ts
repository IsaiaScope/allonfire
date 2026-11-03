import { computedValue } from "../../../shared/tests/computed-style";

/** The rows' box of a list, the table's and its skeleton's alike. */
export const DATA_TABLE_BOX = {
  /** Its border, top and bottom. */
  BORDER_PX: 2,
  /** Each row's line under it. */
  LINE_PX: 1,
  /** The rows it keeps room for, whatever it holds. */
  ROWS: 8,
} as const;

/** A computed length (`40px`) in px. */
export const px = (length: string) => Number.parseFloat(length);

/** A field's height in px, the header's and a row's unless the list says. */
export const fieldHeight = () =>
  px(computedValue("height", "var(--field-height)"));

/**
 * The rows' box a visitor sees: a header as tall as a field and eight rows
 * of `row` px, each with its line, in the border.
 */
export const boxHeight = (row: number) =>
  fieldHeight() +
  (row + DATA_TABLE_BOX.LINE_PX) * DATA_TABLE_BOX.ROWS +
  DATA_TABLE_BOX.BORDER_PX;
