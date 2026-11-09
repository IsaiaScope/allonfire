import { cva } from "class-variance-authority";

/**
 * An Image's row in the list, the table's and its skeleton's alike: the
 * 48px thumbnail and the cell's 8px above and below.
 */
export const imageRow = cva("[--data-table-row:4rem]");
