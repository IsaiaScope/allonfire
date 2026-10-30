import { cva } from "class-variance-authority";

/**
 * A User's row in the list, the table's and its skeleton's alike: their two
 * 20px lines and the cell's 8px above and below. The table keeps eight of
 * them on a short screen.
 */
export const userRow = cva("[--data-table-row:3.5rem]");
