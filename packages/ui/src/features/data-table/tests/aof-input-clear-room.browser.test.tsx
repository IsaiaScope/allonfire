// @module-tag integration
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { AOFFaceted } from "../components/aof-faceted";
import { AOFViewPanel } from "../components/aof-view-panel";
import { FACETED_LABELS } from "./faceted-labels";

/** A mouse's field tile (`2rem`), and a finger's (`2.25rem`). */
const TILES = ["2rem", "2.25rem"];
const TYPED = "Accesso".repeat(20);
const nothing = () => undefined;

afterEach(() => document.documentElement.style.removeProperty("--field-tile"));

/** How far the cross reaches into the input: the room its text must leave. */
const roomNeeded = (input: Element, cross: Element) =>
  input.getBoundingClientRect().right - cross.getBoundingClientRect().left;

/** The input's right padding, and the room its cross needs. */
const paddingAndRoom = (input: ReturnType<typeof page.getByRole>) => {
  const cross = page.getByRole("button", { name: "Clear the search" });
  return {
    padding: Number.parseFloat(getComputedStyle(input.element()).paddingRight),
    room: roomNeeded(input.element(), cross.element()),
  };
};

describe.each(TILES)("a search box with a field tile of %s", (tile) => {
  beforeEach(() =>
    document.documentElement.style.setProperty("--field-tile", tile)
  );

  it("keeps the View tab's text clear of its cross", async () => {
    await render(
      <AOFViewPanel
        columns={[{ id: "a", label: "A" }]}
        hidden={[]}
        labels={{ clear: "Clear the search", empty: "None", search: "Columns" }}
        onHiddenChange={nothing}
      />
    );
    const input = page.getByRole("combobox", { name: "Columns" });
    await userEvent.fill(input, TYPED);
    const { padding, room } = paddingAndRoom(input);
    expect(padding).toBeGreaterThanOrEqual(room);
  });

  it("keeps a Faceted list's text clear of its cross", async () => {
    await render(
      <AOFFaceted
        items={[{ label: "A", value: "a" }]}
        labels={{ ...FACETED_LABELS, clear: "Clear the search" }}
        onValueChange={nothing}
        open
        value={[]}
      />
    );
    const input = page.getByRole("combobox", { name: "Search" });
    await userEvent.fill(input, TYPED);
    const { padding, room } = paddingAndRoom(input);
    expect(padding).toBeGreaterThanOrEqual(room);
  });
});
