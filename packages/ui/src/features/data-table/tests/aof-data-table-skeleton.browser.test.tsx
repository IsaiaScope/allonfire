// @module-tag integration
import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { computedValue } from "../../../shared/tests/computed-style";
import {
  CAN_EMULATE_MEDIA,
  withReducedMotion,
} from "../../../shared/tests/emulated-media";
import { AOFDataTableSkeleton } from "../components/aof-data-table-skeleton";
import { boxHeight, fieldHeight, px } from "./data-table-box";

const LABEL = "Loading People";
/** A list's own row height, taller than a field. */
const OWN_ROW = { CLASS: "[--data-table-row:3rem]", VALUE: "3rem" } as const;
/** shadcn's skeleton pulse (`animate-pulse`). */
const PULSE = "pulse";

const skeleton = async (className?: string) => {
  const screen = await render(
    <AOFDataTableSkeleton className={className} columns={2} label={LABEL} />
  );
  const cell = screen.container.querySelector('[data-skeleton="cell"]');
  // A cell's bar sits in its cell, in its row, in the rows' layer, in the box.
  const row = cell?.parentElement?.parentElement;
  const box = row?.parentElement?.parentElement;
  if (!(cell && row && box)) {
    throw new Error("the skeleton drew no rows");
  }
  return { box, cell, row };
};

beforeEach(() =>
  page.viewport(SCREEN.VIEWPORT.DESKTOP.WIDTH, SCREEN.VIEWPORT.DESKTOP.HEIGHT)
);

describe("AOFDataTableSkeleton", () => {
  // The same sizes as the table it stands in for, so nothing moves when the
  // rows arrive.
  it("keeps the table's eight-row box, each row a field's height", async () => {
    const { box, row } = await skeleton();
    expect(box.getBoundingClientRect().height).toBe(boxHeight(fieldHeight()));
    expect(row.getBoundingClientRect().height).toBe(fieldHeight());
  });

  it("draws each row as tall as the list says", async () => {
    const { box, row } = await skeleton(OWN_ROW.CLASS);
    const own = px(computedValue("height", OWN_ROW.VALUE));
    expect(row.getBoundingClientRect().height).toBe(own);
    expect(box.getBoundingClientRect().height).toBe(boxHeight(own));
  });

  it("pulses where motion is welcome", async () => {
    const { cell } = await skeleton();
    expect(getComputedStyle(cell).animationName).toBe(PULSE);
  });
});

// Only Chromium can be asked for less motion.
describe.runIf(CAN_EMULATE_MEDIA)(
  "AOFDataTableSkeleton asked for less motion",
  () => {
    it("stops pulsing", async () => {
      const { cell } = await skeleton();
      const name = await withReducedMotion(async () =>
        Promise.resolve(getComputedStyle(cell).animationName)
      );
      expect(name).toBe("none");
    });
  }
);
