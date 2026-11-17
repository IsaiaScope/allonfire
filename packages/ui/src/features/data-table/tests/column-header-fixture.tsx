import { AOFColumnHeader } from "../components/aof-column-header";
import { aofColumnHelper } from "../components/aof-data-table";

/** The rows and columns the column header's tests draw. */
export type Item = { apps: string; email: string; id: string; size: number };
export const ITEMS: Item[] = [
  { apps: "laura", email: "a@x.test", id: "1", size: 1 },
  { apps: "office", email: "b@x.test", id: "2", size: 2 },
];
export const LABELS = { asc: "Asc", desc: "Desc", hide: "Hide" };
export const column = aofColumnHelper<Item>();

/** Email sorts and never hides, Size does both, Apps only hides. */
export const headerColumns = () => [
  column.accessor("email", {
    enableHiding: false,
    header: (info) => (
      <AOFColumnHeader column={info.column} label="Email" labels={LABELS} />
    ),
  }),
  column.accessor("size", {
    header: (info) => (
      <AOFColumnHeader column={info.column} label="Size" labels={LABELS} />
    ),
  }),
  column.accessor("apps", {
    enableSorting: false,
    header: (info) => (
      <AOFColumnHeader column={info.column} label="Apps" labels={LABELS} />
    ),
  }),
];
