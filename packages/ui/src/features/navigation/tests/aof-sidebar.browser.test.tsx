// @module-tag integration
import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { cdp, page, server, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  AOFDropdownMenu,
  AOFDropdownMenuItem,
  AOFDropdownMenuTrigger,
} from "../../../shared/components/aof-dropdown-menu";
import {
  afterTransitions,
  computedValue,
  seconds,
} from "../../../shared/tests/computed-style";
import {
  CAN_EMULATE_MEDIA,
  withCoarsePointer,
} from "../../../shared/tests/emulated-media";
import {
  AOFSidebar,
  AOFSidebarDropdownContent,
  AOFSidebarMenu,
  AOFSidebarMenuButton,
  AOFSidebarMenuItem,
  AOFSidebarProvider,
  AOFSidebarTrigger,
} from "../components/aof-sidebar";

const ROW = "Account";
const TOGGLE = "Toggle menu";
const SIGN_OUT = "Sign out";
/** A row's 40px and the menu button's 36px under a mouse. */
const MOUSE_PX = { ROW: 40, TRIGGER: 36 } as const;
/** A phone turned sideways puts its notch on the left. */
const NOTCH_LEFT_PX = 47;

const height = (element: Element) => getComputedStyle(element).height;

/** `element`'s height once it settles, and the finger's target, read while
 *  the pointer is one. */
const touchSize = async (element: Element) => ({
  height: (await afterTransitions(element)).height,
  tap: computedValue("height", "var(--tap-target)"),
});
const accent = () => computedValue("background-color", "var(--sidebar-accent)");

/** A row that opens a menu, as the sidebar's account row does. */
const MenuRow = () => (
  <AOFSidebarProvider>
    <AOFSidebarMenu>
      <AOFSidebarMenuItem>
        <AOFDropdownMenu>
          <AOFDropdownMenuTrigger render={<AOFSidebarMenuButton />}>
            {ROW}
          </AOFDropdownMenuTrigger>
          <AOFSidebarDropdownContent>
            <AOFDropdownMenuItem>{SIGN_OUT}</AOFDropdownMenuItem>
          </AOFSidebarDropdownContent>
        </AOFDropdownMenu>
      </AOFSidebarMenuItem>
    </AOFSidebarMenu>
  </AOFSidebarProvider>
);

const row = async () => {
  const screen = await render(
    <AOFSidebarProvider>
      <AOFSidebarMenuButton>{ROW}</AOFSidebarMenuButton>
    </AOFSidebarProvider>
  );
  return screen.getByRole("button", { name: ROW }).element();
};

const trigger = async () => {
  const screen = await render(
    <AOFSidebarProvider>
      <AOFSidebarTrigger aria-label={TOGGLE} />
    </AOFSidebarProvider>
  );
  return screen.getByRole("button", { name: TOGGLE }).element();
};

beforeEach(() =>
  page.viewport(SCREEN.VIEWPORT.DESKTOP.WIDTH, SCREEN.VIEWPORT.DESKTOP.HEIGHT)
);

describe("AOFSidebar", () => {
  it("keeps a row lit while the menu it opens is open", async () => {
    const screen = await render(<MenuRow />);
    const button = screen.getByRole("button", { name: ROW });
    // The keyboard, not a pointer: a hovered row is lit anyway.
    button.element().focus();
    await userEvent.keyboard("{Enter}");
    await expect.element(page.getByRole("menu")).toBeVisible();
    await expect
      .poll(() => getComputedStyle(button.element()).backgroundColor)
      .toBe(accent());
    await userEvent.keyboard("{Escape}");
    await expect.element(page.getByRole("menu")).not.toBeInTheDocument();
    await expect
      .poll(() => getComputedStyle(button.element()).backgroundColor)
      .not.toBe(accent());
  });

  // On a touch screen a menu opens once the finger lifts: the row's pressed
  // highlight goes off, then on again as the menu opens, and reads as a
  // second tap unless the change fades.
  it("fades a row's highlight, so pressing then opening reads as one tap", async () => {
    const style = getComputedStyle(await row());
    const properties = style.transitionProperty.split(", ");
    const durations = style.transitionDuration.split(", ");
    const fade = properties.indexOf("background-color");
    expect(fade).toBeGreaterThan(-1);
    expect(seconds(durations[fade % durations.length] ?? "0s")).toBeGreaterThan(
      0
    );
  });

  it("draws a row at 40px and the menu button at 36px under a mouse", async () => {
    expect(height(await row())).toBe(`${MOUSE_PX.ROW}px`);
    expect(height(await trigger())).toBe(`${MOUSE_PX.TRIGGER}px`);
  });
});

// Only Chromium can be told its pointer is a finger.
describe.runIf(CAN_EMULATE_MEDIA)("AOFSidebar on a touch screen", () => {
  it("grows a default row to a finger's size on a touch screen", async () => {
    const button = await row();
    const sized = await withCoarsePointer(() => touchSize(button));
    expect(sized.height).toBe(sized.tap);
  });

  it("grows the menu button to a finger's size on a touch screen", async () => {
    const button = await trigger();
    const sized = await withCoarsePointer(() => touchSize(button));
    expect(sized.height).toBe(sized.tap);
  });
});

// WebKit has no way to draw a notch.
describe.runIf(server.browser === "chromium")(
  "AOFSidebar on a notched screen",
  () => {
    afterEach(() =>
      cdp().send("Emulation.setSafeAreaInsetsOverride", { insets: {} })
    );

    it("pads the sidebar's content, not its colour, by the left inset", async () => {
      const screen = await render(
        <AOFSidebarProvider>
          <AOFSidebar label="Menu">Sections</AOFSidebar>
        </AOFSidebarProvider>
      );
      await cdp().send("Emulation.setSafeAreaInsetsOverride", {
        insets: { left: NOTCH_LEFT_PX },
      });
      const inner = screen.container.querySelector('[data-sidebar="sidebar"]');
      if (!inner) {
        throw new Error("the sidebar drew no content");
      }
      expect(getComputedStyle(inner).paddingLeft).toBe(`${NOTCH_LEFT_PX}px`);
      // Its colour still runs to the screen's edge, behind the notch.
      expect(inner.getBoundingClientRect().left).toBe(0);
      expect(getComputedStyle(inner).backgroundColor).toBe(
        computedValue("background-color", "var(--sidebar)")
      );
    });
  }
);
