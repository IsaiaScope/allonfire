// @module-tag integration
import {
  AOFSidebar,
  AOFSidebarProvider,
  AOFSidebarTrigger,
} from "@allonfire/ui/components/aof-sidebar";
import { NuqsTestingAdapter, type UrlUpdateEvent } from "nuqs/adapters/testing";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { NAVIGATION } from "../../constants/navigation";
import { SidebarParam } from "../sidebar-param";

const TRIGGER = "Menu";
/** A desktop window: on a phone shadcn's sidebar is a drawer, not a panel. */
const DESKTOP = { HEIGHT: 800, WIDTH: 1280 } as const;

beforeEach(() => page.viewport(DESKTOP.WIDTH, DESKTOP.HEIGHT));

const renderAt = (
  search: string,
  onUrlUpdate: (event: UrlUpdateEvent) => void = vi.fn()
) =>
  render(
    <NuqsTestingAdapter onUrlUpdate={onUrlUpdate} searchParams={search}>
      <AOFSidebarProvider>
        <SidebarParam />
        <AOFSidebar>Sections</AOFSidebar>
        <AOFSidebarTrigger aria-label={TRIGGER} />
      </AOFSidebarProvider>
    </NuqsTestingAdapter>
  );

/** The desktop sidebar's state: `expanded` or `collapsed`. */
const sidebarState = () =>
  document
    .querySelector('[data-slot="sidebar"][data-state]')
    ?.getAttribute("data-state");

describe("SidebarParam", () => {
  it("opens the sidebar collapsed when the address says so", async () => {
    await renderAt(`?${NAVIGATION.PARAM.SIDEBAR}=false`);
    await expect.poll(sidebarState).toBe("collapsed");
  });

  it("writes the state to the address when the menu toggles", async () => {
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    const screen = await renderAt("", onUrlUpdate);
    await screen.getByRole("button", { name: TRIGGER }).click();
    await expect
      .poll(() => onUrlUpdate.mock.lastCall?.[0].queryString)
      .toBe(`?${NAVIGATION.PARAM.SIDEBAR}=false`);
  });

  it("falls back to open on a value it cannot read", async () => {
    await renderAt(`?${NAVIGATION.PARAM.SIDEBAR}=banana`);
    await expect.poll(sidebarState).toBe("expanded");
  });
});
