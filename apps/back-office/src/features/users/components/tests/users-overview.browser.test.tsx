// @module-tag integration

import { BACK_OFFICE } from "@/shared/constants/back-office";
import { USER_OVERVIEW, USER_OVERVIEW_URL } from "@/shared/tests/msw/handlers";
import { setupOverview } from "@/shared/tests/overview-states";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import { UsersOverview } from "../users-overview";

const t = EN.Users.overview;

const { answer, renderChart, renderView } = setupOverview({
  loaded: USER_OVERVIEW,
  name: "UsersOverview",
  t,
  url: USER_OVERVIEW_URL,
  view: <UsersOverview />,
});

describe("UsersOverview", () => {
  it("shows the total as one badge", async () => {
    const screen = await renderView();
    await expect.element(screen.getByText("4 Users")).toBeVisible();
    expect(
      screen.container.querySelectorAll('[data-slot="badge"]')
    ).toHaveLength(1);
  });

  it("draws a Users bar and an Admins bar per App", async () => {
    const { chart } = await renderChart();
    await expect.element(chart).toBeVisible();
    const element = chart.element();
    await expect
      .poll(() => element.querySelectorAll(".recharts-bar-rectangle").length)
      .toBe(4);
    expect(element.textContent).toContain(t.chart.users);
    expect(element.textContent).toContain(t.chart.admins);
    expect(element.textContent).toContain("Laura");
    expect(element.textContent).toContain(BACK_OFFICE.NAME);
  });

  it("says no User is a member of an App when there are none", async () => {
    answer({ byApp: [], total: 0 });
    const screen = await renderView();
    await expect.element(screen.getByText(t.chart.empty)).toBeVisible();
    await expect.element(screen.getByText("0 Users")).toBeVisible();
  });
});
