// @module-tag integration
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { NextIntlClientProvider } from "next-intl";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import { UsersListSkeleton } from "../users-list-skeleton";

/** As wide as a list beside the sidebar, where the toolbar is one row. */
const WIDE_PX = 1100;
/** As narrow as a phone's list, where the search takes its own row. */
const NARROW_PX = 360;

/** The toolbar's search and Filter shapes, the list `width` wide. */
const renderToolbar = async (width: number) => {
  const screen = await render(
    <NextIntlClientProvider locale={I18N.DEFAULT_LANGUAGE} messages={EN}>
      <div style={{ width }}>
        <UsersListSkeleton />
      </div>
    </NextIntlClientProvider>
  );
  const row = screen.container.querySelector(
    '[aria-hidden="true"]'
  )?.firstElementChild;
  const [search, filter] = row ? [...row.children] : [];
  if (!(search && filter)) {
    throw new Error("the toolbar has no search and Filter");
  }
  return {
    filter: filter.getBoundingClientRect(),
    search: search.getBoundingClientRect(),
  };
};

beforeEach(() =>
  page.viewport(SCREEN.VIEWPORT.DESKTOP.WIDTH, SCREEN.VIEWPORT.DESKTOP.HEIGHT)
);

describe("UsersListSkeleton", () => {
  it("lays the toolbar out by the list's width, as the toolbar does", async () => {
    const wide = await renderToolbar(WIDE_PX);
    expect(wide.filter.top).toBe(wide.search.top);
    const narrow = await renderToolbar(NARROW_PX);
    expect(narrow.filter.top).toBeGreaterThanOrEqual(narrow.search.bottom);
  });
});
