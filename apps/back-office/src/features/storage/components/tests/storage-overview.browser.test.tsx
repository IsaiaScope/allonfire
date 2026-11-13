// @module-tag integration

import { STORAGE_USAGE } from "@allonfire/api/features/storage-usage/constants/storage-usage";
import { formatSize } from "@allonfire/core/shared/utils/format-size";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import {
  STORAGE_OVERVIEW,
  STORAGE_OVERVIEW_URL,
} from "@/shared/tests/msw/handlers";
import { setupOverview } from "@/shared/tests/overview-states";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import { StorageOverview } from "../storage-overview";

const t = EN.Storage;
const IMAGE_KIND = STORAGE_USAGE.BUCKET_KIND.IMAGE;
const AS_OF = "2026-11-09T10:00:00.000Z";
const SIZE_OF_BUCKET = formatSize(
  STORAGE_OVERVIEW.buckets[0]?.reading?.bytes ?? 0
);

vi.mock(
  "@/features/i18n/navigation",
  () => import("@/shared/tests/navigation-mock")
);

const { answer, renderChart, renderView } = setupOverview({
  loaded: STORAGE_OVERVIEW,
  name: "StorageOverview",
  t,
  url: STORAGE_OVERVIEW_URL,
  view: <StorageOverview />,
});

describe("StorageOverview", () => {
  it("titles the card by the bucket's name", async () => {
    const screen = await renderView();
    await expect
      .element(screen.getByRole("heading", { name: "image" }))
      .toBeVisible();
  });

  it("shows the files and size badges only, each in its own colour", async () => {
    const screen = await renderView();
    await expect.element(screen.getByText("5 files")).toBeVisible();
    await expect.element(screen.getByText("2 Images")).not.toBeInTheDocument();
    const badges = [
      ...screen.container.querySelectorAll('[data-slot="badge"]'),
    ];
    expect(badges.map(({ textContent }) => textContent)).toEqual([
      "5 files",
      SIZE_OF_BUCKET,
    ]);
    const [files, size] = badges.map(
      (badge) => getComputedStyle(badge).backgroundColor
    );
    expect(files).not.toBe(size);
  });

  it("draws one bar group per App with public and private bytes", async () => {
    const { chart } = await renderChart();
    await expect.element(chart).toBeVisible();
    const element = chart.element();
    await expect
      .poll(() => element.querySelectorAll(".recharts-bar-rectangle").length)
      .toBeGreaterThanOrEqual(3);
    expect(element.textContent).toContain("Laura");
    expect(element.textContent).toContain(BACK_OFFICE.NAME);
    expect(element.textContent).toContain(t.chart.public);
    expect(element.textContent).toContain(t.chart.private);
  });

  it("gives every App a line of Avatars beside its public and private ones", async () => {
    const { chart } = await renderChart();
    await expect.element(chart).toBeVisible();
    const element = chart.element();
    await expect.poll(() => element.textContent).toContain(t.chart.avatars);
    // Two Apps, three lines each (public, private, Avatars); Laura has no
    // private bytes, and a bar of nothing is not drawn.
    await expect
      .poll(() => element.querySelectorAll(".recharts-bar-rectangle").length)
      .toBe(5);
  });

  it("says the files could not be counted, and still draws the chart, when the bucket cannot be listed", async () => {
    answer({
      ...STORAGE_OVERVIEW,
      buckets: [{ id: "image", kind: IMAGE_KIND, reading: null }],
    });
    const screen = await renderView();
    await expect.element(screen.getByText(t.error.bucket)).toBeVisible();
    await expect
      .element(screen.getByRole("img", { name: t.chart.label }))
      .toBeVisible();
  });

  it("says nothing is stored when no Image exists", async () => {
    answer({
      ...STORAGE_OVERVIEW,
      avatars: { byApp: [] },
      buckets: [
        {
          id: "image",
          kind: IMAGE_KIND,
          reading: { asOf: AS_OF, bytes: 0, objects: 0 },
        },
      ],
      images: { byApp: [], total: 0, totalBytes: 0 },
    });
    const screen = await renderView();
    await expect.element(screen.getByText(t.chart.empty)).toBeVisible();
  });

  it("draws the Images' card for the image bucket whatever its configured name is", async () => {
    answer({
      ...STORAGE_OVERVIEW,
      buckets: [
        {
          ...STORAGE_OVERVIEW.buckets[0],
          id: "photos-prod",
        },
      ],
    });
    const screen = await renderView();
    await expect
      .element(screen.getByRole("heading", { name: "photos-prod" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("img", { name: t.chart.label }))
      .toBeVisible();
  });
});

describe("StorageOverview card", () => {
  it("sets the badges on the title's row, at the card's right edge", async () => {
    const screen = await renderView();
    const title = screen.getByRole("heading", { name: "image" });
    await expect.element(title).toBeVisible();
    const heading = title.element().getBoundingClientRect();
    const badges = [
      ...screen.container.querySelectorAll('[data-slot="badge"]'),
    ].map((badge) => badge.getBoundingClientRect());
    expect(badges).toHaveLength(2);
    for (const badge of badges) {
      const gap =
        badge.top + badge.height / 2 - (heading.top + heading.height / 2);
      expect(Math.abs(gap)).toBeLessThan(6);
      expect(badge.left).toBeGreaterThan(heading.right);
    }
  });

  it("titles the chart by its label only, with no heading of its own", async () => {
    const screen = await renderView();
    await expect
      .element(screen.getByRole("img", { name: t.chart.label }))
      .toBeVisible();
    expect(screen.container.querySelectorAll("h3")).toHaveLength(1);
  });
});
