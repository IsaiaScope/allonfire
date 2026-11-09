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
import { AOFFrameHeader } from "../components/aof-frame-header";
import {
  AOFSidebar,
  AOFSidebarDropdownContent,
  AOFSidebarHeader,
  AOFSidebarInset,
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
/** `--page-gutter`, 1.5rem. */
const GUTTER_PX = 24;

/** Set, the sidebar takes it for shadcn's phone test: iOS can fire the
 *  breakpoint's change before the screen's new width, and leave the drawer
 *  standing in on a phone turned sideways. */
const forced: { mobile: boolean | undefined } = { mobile: undefined };

vi.mock("@allonfire/shadcn/hooks/use-mobile", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@allonfire/shadcn/hooks/use-mobile")>();
  return {
    useIsMobile: () => {
      const mobile = actual.useIsMobile();
      return forced.mobile ?? mobile;
    },
  };
});

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
  // iOS fires the breakpoint's change mid-turn, while `innerWidth` still
  // holds the old width: the sidebar follows the breakpoint, as CSS does.
  it("docks once a phone turns sideways, though the width it reports lags", async () => {
    await page.viewport(
      SCREEN.VIEWPORT.PHONE.WIDTH,
      SCREEN.VIEWPORT.PHONE.HEIGHT
    );
    const screen = await render(
      <AOFSidebarProvider>
        <AOFSidebar label="Menu">Sections</AOFSidebar>
      </AOFSidebarProvider>
    );
    const lagging = Object.getOwnPropertyDescriptor(window, "innerWidth");
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      get: () => SCREEN.VIEWPORT.PHONE.WIDTH,
    });
    try {
      await page.viewport(
        SCREEN.VIEWPORT.PHONE_LANDSCAPE.WIDTH,
        SCREEN.VIEWPORT.PHONE_LANDSCAPE.HEIGHT
      );
      await expect
        .poll(() => screen.container.querySelector('[data-slot="sidebar-gap"]'))
        .not.toBeNull();
    } finally {
      if (lagging) {
        Object.defineProperty(window, "innerWidth", lagging);
      } else {
        Reflect.deleteProperty(window, "innerWidth");
      }
    }
  });

  it("keeps a row lit while the menu it opens is open", async () => {
    const screen = await render(<MenuRow />);
    const button = screen.getByRole("button", { name: ROW });
    // An earlier test leaves the pointer where it clicked, maybe over this row.
    await userEvent.unhover(button.element());
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
    afterEach(() => {
      forced.mobile = undefined;
      return cdp().send("Emulation.setSafeAreaInsetsOverride", { insets: {} });
    });

    /** A frame with a page in it: `paddingLeft` of what pads by the left
     *  inset left to clear, and of the page's left gutter. */
    const frame = async () => {
      const screen = await render(
        <AOFSidebarProvider>
          <AOFSidebar label="Menu">Sections</AOFSidebar>
          <AOFSidebarInset>
            <AOFSidebarTrigger aria-label={TOGGLE} />
            <div className="pl-(--frame-inset-left)" data-testid="inset" />
            <div className="pl-(--gutter-left)" data-testid="gutter" />
          </AOFSidebarInset>
        </AOFSidebarProvider>
      );
      await cdp().send("Emulation.setSafeAreaInsetsOverride", {
        insets: { left: NOTCH_LEFT_PX },
      });
      const left = (id: string) =>
        getComputedStyle(screen.getByTestId(id).element()).paddingLeft;
      return { gutter: left("gutter"), inset: left("inset"), screen };
    };

    /** The frame's two top bars, the screen's top, left and right notched. */
    const bars = async () => {
      const screen = await render(
        <AOFSidebarProvider>
          <AOFSidebar label="Menu">
            <AOFSidebarHeader>Apps</AOFSidebarHeader>
          </AOFSidebar>
          <AOFSidebarInset>
            <AOFFrameHeader>
              <AOFSidebarTrigger aria-label={TOGGLE} />
            </AOFFrameHeader>
          </AOFSidebarInset>
        </AOFSidebarProvider>
      );
      const header = screen
        .getByRole("button", { name: TOGGLE })
        .element()
        .closest("header");
      const sidebarHeader = screen.container.querySelector(
        '[data-slot="sidebar-header"]'
      );
      if (!header) {
        throw new Error("the frame drew no top bar");
      }
      const clear = header.getBoundingClientRect().height;
      await cdp().send("Emulation.setSafeAreaInsetsOverride", {
        insets: {
          left: NOTCH_LEFT_PX,
          right: NOTCH_LEFT_PX,
          top: NOTCH_LEFT_PX,
        },
      });
      return {
        clear,
        header: getComputedStyle(header),
        headerBox: header,
        sidebarHeader,
      };
    };

    it("keeps both top bars below a notch above, level, and the header's ends clear of one on either side", async () => {
      const { clear, header, headerBox, sidebarHeader } = await bars();
      expect(header.paddingTop).toBe(`${NOTCH_LEFT_PX}px`);
      if (!sidebarHeader) {
        throw new Error("the docked sidebar drew no header");
      }
      expect(getComputedStyle(sidebarHeader).paddingTop).toBe(
        `${NOTCH_LEFT_PX}px`
      );
      expect(headerBox.getBoundingClientRect().height).toBe(
        clear + NOTCH_LEFT_PX
      );
      expect(sidebarHeader.getBoundingClientRect().height).toBe(
        headerBox.getBoundingClientRect().height
      );
      expect(header.paddingRight).toBe(`${16 + NOTCH_LEFT_PX}px`);
      // Beside the sidebar, which clears the left notch itself.
      expect(header.paddingLeft).toBe("16px");
    });

    it("keeps the header's start clear of a left notch with no sidebar beside it", async () => {
      await page.viewport(
        SCREEN.VIEWPORT.PHONE.WIDTH,
        SCREEN.VIEWPORT.PHONE.HEIGHT
      );
      const { header } = await bars();
      expect(header.paddingLeft).toBe(`${16 + NOTCH_LEFT_PX}px`);
    });

    it("leaves the left notch to the sidebar beside the page", async () => {
      const { gutter, inset } = await frame();
      expect(inset).toBe("0px");
      expect(gutter).toBe(`${GUTTER_PX}px`);
    });

    it("keeps the page clear of the left notch with no sidebar beside it", async () => {
      await page.viewport(
        SCREEN.VIEWPORT.PHONE.WIDTH,
        SCREEN.VIEWPORT.PHONE.HEIGHT
      );
      const { gutter, inset } = await frame();
      expect(inset).toBe(`${NOTCH_LEFT_PX}px`);
      expect(gutter).toBe(`${NOTCH_LEFT_PX}px`);
    });

    it("keeps the page and the drawer clear of the left notch when the drawer stands in on a wide screen", async () => {
      await page.viewport(
        SCREEN.VIEWPORT.PHONE_LANDSCAPE.WIDTH,
        SCREEN.VIEWPORT.PHONE_LANDSCAPE.HEIGHT
      );
      forced.mobile = true;
      const { gutter, inset, screen } = await frame();
      expect(inset).toBe(`${NOTCH_LEFT_PX}px`);
      expect(gutter).toBe(`${NOTCH_LEFT_PX}px`);
      await screen.getByRole("button", { name: TOGGLE }).click();
      const drawer = page.getByRole("dialog");
      await expect.element(drawer).toBeVisible();
      expect(getComputedStyle(drawer.element()).paddingLeft).toBe(
        `${NOTCH_LEFT_PX}px`
      );
    });

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
