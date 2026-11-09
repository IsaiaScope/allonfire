import { aofColumnHelper } from "../components/aof-data-table";

/** The rows the table's tests list, Node's and the browser's alike. */
export type Person = { id: string; name: string; role: string };

export const PEOPLE: Person[] = [
  { id: "1", name: "Ada", role: "Admin" },
  { id: "2", name: "Grace", role: "User" },
];

export const peopleColumns = aofColumnHelper<Person>();

export const PEOPLE_COLUMNS = peopleColumns.columns([
  peopleColumns.accessor("name", { header: "Name" }),
  peopleColumns.accessor("role", { header: "Role" }),
]);
