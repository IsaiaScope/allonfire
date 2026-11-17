// @module-tag integration
import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { AOFFaceted } from "../components/aof-faceted";
import { AOFSortPanel } from "../components/aof-sort-panel";
import { AOFViewPanel } from "../components/aof-view-panel";
import { FACETED_LABELS } from "./faceted-labels";

const LONG =
  "docs/superpowers/plans/2026-11-17-laura-p0-drop-viewer.md docs/superpowers/plans/2026-11-17-laura-p0-drop-viewer.md docs/superpowers/plans/2026-11-17-laura-p0-drop-viewer.md docs/superpowers/plans/2026-11-17-laura-p0-drop-viewer.md";
/** One long word, no space to break at: it is never split, one line ending in an ellipsis. */
const UNBROKEN = "Accesso".repeat(30);
const nothing = () => undefined;

/** The parts of the option standing past the option's own right edge. */
const escapes = (option: Element) => {
  const edge = option.getBoundingClientRect().right;
  return [option, ...option.querySelectorAll("*")]
    .filter((part) => part instanceof HTMLElement)
    .filter((part) => part.getBoundingClientRect().right > edge + 1)
    .map((part) => `${part.tagName} ${part.className}`);
};

/** How many lines the option's text box shows (the box that holds the label itself, clamped to two). */
const linesOf = (option: Element, label: string) => {
  const box = [option, ...option.querySelectorAll("*")]
    .filter((part) => part instanceof HTMLElement)
    .find((part) =>
      [...part.childNodes].some(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent === label
      )
    );
  if (!box) {
    return Number.NaN;
  }
  const line = Number.parseFloat(getComputedStyle(box).lineHeight);
  return Math.round(box.getBoundingClientRect().height / line);
};

/** What an option shows: what stands past its row, its lines of text, and whether a cut word ends in an ellipsis. */
const shapeOf = (option: Element, label: string) => ({
  ellipsis: [option, ...option.querySelectorAll("*")].some(
    (part) => getComputedStyle(part).textOverflow === "ellipsis"
  ),
  escapes: escapes(option),
  lines: linesOf(option, label),
});

/** The most lines a label takes: a giant word is never split, so it takes one; any other wraps at spaces, to two. */
const maxLines = (label: string) => (label === UNBROKEN ? 1 : 2);

beforeEach(() =>
  page.viewport(SCREEN.VIEWPORT.PHONE.WIDTH, SCREEN.VIEWPORT.PHONE.HEIGHT)
);

describe.each([
  ["a long name", LONG],
  ["one long word", UNBROKEN],
])("%s as an option", (_kind, label) => {
  it("wraps at spaces in the View tab, never inside a word", async () => {
    await render(
      <AOFViewPanel
        columns={[{ id: "long", label }]}
        hidden={[]}
        labels={{ clear: "Clear", empty: "None", search: "Columns" }}
        onHiddenChange={nothing}
      />
    );
    const shape = shapeOf(page.getByRole("option").element(), label);
    expect(shape.escapes).toEqual([]);
    expect(shape.ellipsis).toBe(true);
    expect(shape.lines).toBeLessThanOrEqual(maxLines(label));
  });

  it("wraps at spaces in a Faceted list, never inside a word", async () => {
    await render(
      <AOFFaceted
        items={[{ label, value: "long" }]}
        labels={FACETED_LABELS}
        onValueChange={nothing}
        open
        value={[]}
      />
    );
    const shape = shapeOf(page.getByRole("option").first().element(), label);
    expect(shape.escapes).toEqual([]);
    expect(shape.ellipsis).toBe(true);
    expect(shape.lines).toBeLessThanOrEqual(maxLines(label));
  });
});

describe("a long column name in a sort row", () => {
  const LABELS = {
    add: "Add",
    asc: "Asc",
    column: "Column",
    desc: "Desc",
    direction: "Direction",
    drag: "Drag",
    remove: "Remove",
  };

  it("ends in an ellipsis in the select, and in its options, never split", async () => {
    await render(
      <AOFSortPanel
        columns={[
          { id: "long", label: UNBROKEN },
          { id: "short", label: "Short" },
        ]}
        labels={LABELS}
        max={2}
        onSortingChange={nothing}
        sorting={[{ desc: false, id: "long" }]}
      />
    );
    const select = page.getByRole("combobox", { name: "Column" });
    const value = select.element().querySelector('[data-slot="select-value"]');
    expect(getComputedStyle(value ?? document.body).textOverflow).toBe(
      "ellipsis"
    );
    await userEvent.click(select);
    const option = page.getByRole("option").first().element();
    const shape = shapeOf(option, UNBROKEN);
    expect(shape.escapes).toEqual([]);
    expect(shape.ellipsis).toBe(true);
    expect(shape.lines).toBe(1);
    // The check of the chosen option stands beside its text, never over it.
    const text = option.querySelector("div")?.getBoundingClientRect();
    const check = option
      .querySelector("[data-selected]")
      ?.getBoundingClientRect();
    expect(text?.right).toBeLessThanOrEqual(check?.left ?? 0);
  });
});
