import type { AOFFacetedLabels } from "../components/aof-faceted";

/** A Faceted list's words, for tests that only need it to render. */
export const FACETED_LABELS: AOFFacetedLabels = {
  add: "Add",
  clear: "Clear",
  empty: "None",
  reset: "Reset",
  search: "Search",
  selected: (count) => `${count} selected`,
  trigger: "Name",
};
