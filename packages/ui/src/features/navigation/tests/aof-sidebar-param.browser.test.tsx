// @module-tag integration

import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { NuqsTestingAdapter, type UrlUpdateEvent } from "nuqs/adapters/testing";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  AOFSidebar,
  AOFSidebarProvider,
  AOFSidebarTrigger,
} from "../components/aof-sidebar";
import { AOFSidebarParam } from "../components/aof-sidebar-param";
import { NAVIGATION } from "../constants/navigation";

const common = SHARED_TRANSLATIONS.en.Common.Navigation;

beforeEach(() =>
  page.viewport(SCREEN.VIEWPORT.DESKTOP.WIDTH, SCREEN.VIEWPORT.DESKTOP.HEIGHT)
);

const Frame = ({
  onUrlUpdate = vi.fn(),
  search,
}: {
  onUrlUpdate?: (event: UrlUpdateEvent) => void;
  search: string;
}) => (
  <NuqsTestingAdapter hasMemory onUrlUpdate={onUrlUpdate} searchParams={search}>
    <AOFSidebarProvider>
      <AOFSidebarParam />
      <AOFSidebar label={common.menu}>Sections</AOFSidebar>
      <AOFSidebarTrigger aria-label={common.toggleMenu} />
    </AOFSidebarProvider>
  </NuqsTestingAdapter>
);

const renderAt = (
  search: string,
  onUrlUpdate: (event: UrlUpdateEvent) => void = vi.fn()
) => render(<Frame onUrlUpdate={onUrlUpdate} search={search} />);

/** The desktop sidebar's state: `expanded` or `collapsed`. */
const sidebarState = () =>
  document
    .querySelector('[data-slot="sidebar"][data-state]')
    ?.getAttribute("data-state");

describe("AOFSidebarParam", () => {
  it("opens the sidebar collapsed when the address says so", async () => {
    await renderAt(`?${NAVIGATION.PARAM.SIDEBAR}=false`);
    await expect.poll(sidebarState).toBe("collapsed");
  });

  it("writes the state to the address when the menu toggles", async () => {
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    const screen = await renderAt("", onUrlUpdate);
    await screen.getByRole("button", { name: common.toggleMenu }).click();
    await expect
      .poll(() => onUrlUpdate.mock.lastCall?.[0].queryString)
      .toBe(`?${NAVIGATION.PARAM.SIDEBAR}=false`);
  });

  it("writes the collapsed state back when a link to a bare address drops it", async () => {
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    const screen = await renderAt(
      `?${NAVIGATION.PARAM.SIDEBAR}=false`,
      onUrlUpdate
    );
    await expect.poll(sidebarState).toBe("collapsed");
    onUrlUpdate.mockClear();
    // A Section link navigates to its bare address: the layout stays mounted,
    // so the sidebar stays collapsed, and a refresh would open it.
    await screen.rerender(<Frame onUrlUpdate={onUrlUpdate} search="" />);
    await expect
      .poll(() => onUrlUpdate.mock.lastCall?.[0].queryString)
      .toBe(`?${NAVIGATION.PARAM.SIDEBAR}=false`);
    expect(sidebarState()).toBe("collapsed");
  });

  it("falls back to open on a value it cannot read", async () => {
    await renderAt(`?${NAVIGATION.PARAM.SIDEBAR}=banana`);
    await expect.poll(sidebarState).toBe("expanded");
  });
});
