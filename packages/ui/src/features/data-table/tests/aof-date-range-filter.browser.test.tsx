// @module-tag integration
import type { DayRange } from "@allonfire/core/features/search/utc-day-range";
import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { useState } from "react";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { AOFDateRangeFilter } from "../components/aof-date-range-filter";
import { AOFFaceted } from "../components/aof-faceted";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const format = (written: string) => {
  const [year = "", month = "1", date = ""] = written.split("-");
  return `${MONTHS[Number(month) - 1]} ${Number(date)}, ${year}`;
};
/** The month the calendar opens on, when no day is chosen: today's. */
const TODAY = new Date(2026, 10, 15, 12);
const NARROW = { HEIGHT: 800, WIDTH: 360 } as const;
const WHOLE_MONTH = 10;

/** What the harness reports out, for a test to read. */
const reported: { value: DayRange | null } = { value: null };

const Filter = ({
  first = null,
  language,
}: {
  first?: DayRange | null;
  language?: string;
}) => {
  const [value, setValue] = useState<DayRange | null>(first);
  reported.value = value;
  return (
    <AOFDateRangeFilter
      format={format}
      label="Created"
      labels={{ clear: "Clear" }}
      language={language}
      onValueChange={setValue}
      value={value}
    />
  );
};

const CHIP = /^Created/;
const nothing = () => undefined;
const BOTH_DAYS = /Nov 26, 2026 – Nov 28, 2026/;
const NOVEMBRE_26 = /26 novembre 2026/;
const MESE_PRECEDENTE = /precedente/i;
const MARCH_5 = /March 5th,/;
const open = () => userEvent.click(page.getByRole("button", { name: CHIP }));
const day = (date: number) =>
  page.getByRole("button", {
    name: new RegExp(`November ${date}(?:st|nd|rd|th),`),
  });

beforeEach(() => {
  vi.useFakeTimers({ now: TODAY, toFake: ["Date"] });
  return page.viewport(
    SCREEN.VIEWPORT.DESKTOP.WIDTH,
    SCREEN.VIEWPORT.DESKTOP.HEIGHT
  );
});
afterEach(() => {
  vi.useRealTimers();
});

describe("AOFDateRangeFilter calendar", () => {
  it("stores the two days picked, and shows them on the chip", async () => {
    await render(<Filter />);
    await open();
    await userEvent.click(day(26));
    await userEvent.click(day(28));
    expect(reported.value).toEqual({ from: "2026-11-26", to: "2026-11-28" });
    await expect
      .element(page.getByRole("button", { name: BOTH_DAYS }))
      .toBeVisible();
  });

  it("picks two days with the keyboard: Enter, an arrow, Enter, and the focus follows", async () => {
    await render(<Filter />);
    await open();
    day(26).element().focus();
    await userEvent.keyboard("{Enter}");
    // A day button the calendar re-drew would lose the focus.
    await expect.element(day(26)).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect.element(day(27)).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(reported.value).toEqual({ from: "2026-11-26", to: "2026-11-27" });
  });

  it("speaks the page's language: Italian months, weekdays and spoken labels", async () => {
    await render(<Filter language="it" />);
    await open();
    await expect
      .element(page.getByRole("button", { name: NOVEMBRE_26 }))
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: MESE_PRECEDENTE }))
      .toBeVisible();
    await expect.element(page.getByText("lun")).toBeVisible();
  });

  it("stores a single day while the second is still to be picked", async () => {
    await render(<Filter />);
    await open();
    await userEvent.click(day(26));
    expect(reported.value).toEqual({ from: "2026-11-26", to: "2026-11-26" });
  });

  it("clears from the ⓧ at the start of the chip, before the label", async () => {
    await render(<Filter first={{ from: "2026-11-26", to: "2026-11-28" }} />);
    const chip = page.getByRole("button", { name: CHIP }).element();
    const cross = chip.querySelector(".tabler-icon-circle-x");
    const label = chip.querySelector("span.shrink-0");
    if (cross === null) {
      throw new Error("The chip has no clear cross");
    }
    expect(label).not.toBeNull();
    expect(cross?.getBoundingClientRect().right).toBeLessThanOrEqual(
      label?.getBoundingClientRect().left ?? 0
    );
    await userEvent.click(page.elementLocator(cross));
    expect(reported.value).toBeNull();
  });

  it("clears from the button under the calendar", async () => {
    await render(<Filter first={{ from: "2026-11-26", to: "2026-11-28" }} />);
    await open();
    await userEvent.click(page.getByRole("button", { name: "Clear" }));
    expect(reported.value).toBeNull();
  });

  it("opens on the month of the first day chosen", async () => {
    await render(<Filter first={{ from: "2026-03-05", to: "2026-03-07" }} />);
    await open();
    await expect
      .element(page.getByRole("button", { name: MARCH_5 }))
      .toBeVisible();
  });

  it("opens with Enter, closes with Escape and stays inside a 360 px screen", async () => {
    await page.viewport(NARROW.WIDTH, NARROW.HEIGHT);
    await render(<Filter />);
    page.getByRole("button", { name: CHIP }).element().focus();
    await userEvent.keyboard("{Enter}");
    const popup = page.getByRole("dialog");
    await expect.element(popup).toBeVisible();
    const box = popup.element().getBoundingClientRect();
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(window.innerWidth);
    await userEvent.keyboard("{Escape}");
    await expect.element(popup).not.toBeInTheDocument();
  });
});

describe("AOFDateRangeFilter size", () => {
  it("is as tall, as wide and as large in text as a Faceted trigger beside it", async () => {
    const field = { className: "px-3", size: "field" } as const;
    await render(
      <div className="flex w-80 flex-col gap-2 *:w-full">
        <AOFFaceted
          items={[{ label: "One", value: "one" }]}
          labels={{
            add: "Add",
            clear: "Clear",
            empty: "No match",
            reset: "Reset",
            search: "Search",
            selected: (count) => `${count} selected`,
            trigger: "App",
          }}
          onValueChange={nothing}
          triggerProps={field}
          value={[]}
        />
        <AOFDateRangeFilter
          format={format}
          label="Created"
          labels={{ clear: "Clear" }}
          onValueChange={nothing}
          triggerProps={field}
          value={null}
        />
      </div>
    );
    const faceted = page.getByRole("button", { name: "App" }).element();
    const created = page.getByRole("button", { name: CHIP }).element();
    expect(created.getBoundingClientRect().height).toBe(
      faceted.getBoundingClientRect().height
    );
    expect(created.getBoundingClientRect().width).toBe(
      faceted.getBoundingClientRect().width
    );
    expect(getComputedStyle(created).fontSize).toBe(
      getComputedStyle(faceted).fontSize
    );
    expect(created.querySelector("svg")?.getBoundingClientRect().width).toBe(
      faceted.querySelector("svg")?.getBoundingClientRect().width
    );
  });
});

// The calendar shows a whole month: a sanity check that it drew its days.
it("draws the days of the month", async () => {
  await render(<Filter />);
  await open();
  await expect.element(day(WHOLE_MONTH)).toBeVisible();
});
