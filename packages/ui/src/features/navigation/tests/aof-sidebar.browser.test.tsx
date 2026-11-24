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
  clearSafeAreaInsets,
  notchedPhone,
  withCoarsePointer,
} from "../../../shared/tests/emulated-media";
import { AOFAccountPlaceholder } from "../components/aof-account";
import { AOFFrameHeader } from "../components/aof-frame-header";
import {
  AOFSidebar,
  AOFSidebarContent,
  AOFSidebarDropdownContent,
  AOFSidebarGroup,
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

// A Design declares these on `:root` and sets none it does not want: the
// frame reads each with a fallback to shadcn's own value.
const FRAME_TOKENS = [
  "--frame-gap",
  "--frame-radius",
  "--frame-shadow",
] as const;
const SHADCN_FLOATING_SHADOW = "0px 1px 3px 0px";
/** The folded rail, 3.375rem (`AOFSidebarProvider`'s `--sidebar-width-icon`). */
const RAIL_PX = 54;

const declareFrame = (
  tokens: Partial<Record<(typeof FRAME_TOKENS)[number], string>>
) => {
  for (const name of FRAME_TOKENS) {
    const value = tokens[name];
    if (value) {
      document.documentElement.style.setProperty(name, value);
    }
  }
};

const frameParts = async (variant: "floating" | "sidebar", open = true) => {
  const screen = await render(
    <AOFSidebarProvider defaultOpen={open}>
      <AOFSidebar label="Menu" variant={variant}>
        Sections
      </AOFSidebar>
    </AOFSidebarProvider>
  );
  const part = (selector: string) => {
    const element = screen.container.querySelector(selector);
    if (!element) {
      throw new Error(`the sidebar drew no ${selector}`);
    }
    return element;
  };
  return {
    container: part('[data-slot="sidebar-container"]'),
    gap: part('[data-slot="sidebar-gap"]'),
    inner: part('[data-sidebar="sidebar"]'),
  };
};

/** The folded rail's icon: 22px, in a 40px square (the rail's content width). */
const FOLDED_ICON_PX = 22;
const FOLDED_SQUARE_PX = 40;

describe("a folded sidebar", () => {
  const foldedRow = async () => {
    const screen = await render(
      <AOFSidebarProvider defaultOpen={false}>
        <AOFSidebar label="Menu" variant="floating">
          <AOFSidebarContent>
            <AOFSidebarGroup>
              <AOFSidebarMenu>
                <AOFSidebarMenuItem>
                  <AOFSidebarMenuButton>
                    <svg aria-hidden data-testid="icon" />
                    <span>{ROW}</span>
                  </AOFSidebarMenuButton>
                </AOFSidebarMenuItem>
              </AOFSidebarMenu>
            </AOFSidebarGroup>
          </AOFSidebarContent>
        </AOFSidebar>
      </AOFSidebarProvider>
    );
    const button = screen.getByRole("button", { name: ROW }).element();
    const inner = screen.container.querySelector('[data-sidebar="sidebar"]');
    await afterTransitions(button);
    return { button, icon: screen.getByTestId("icon").element(), inner };
  };

  const centre = (element: Element | null) => {
    const box = element?.getBoundingClientRect();
    return box ? box.left + box.width / 2 : Number.NaN;
  };

  it("centres a row's icon in the rail", async () => {
    const { button, icon, inner } = await foldedRow();
    expect(centre(icon)).toBeCloseTo(centre(inner), 0);
    expect(centre(button)).toBeCloseTo(centre(inner), 0);
  });

  it("centres the account's avatar in the rail", async () => {
    const screen = await render(
      <AOFSidebarProvider defaultOpen={false}>
        <AOFSidebar label="Menu" variant="floating">
          <AOFSidebarContent>
            <AOFSidebarGroup>
              <AOFAccountPlaceholder />
            </AOFSidebarGroup>
          </AOFSidebarContent>
        </AOFSidebar>
      </AOFSidebarProvider>
    );
    const inner = screen.container.querySelector('[data-sidebar="sidebar"]');
    const avatar = screen.container.querySelector("span.size-8");
    await afterTransitions(inner ?? document.body);
    expect(centre(avatar)).toBeCloseTo(centre(inner), 0);
  });

  // A phone turned sideways: the notch's inset widens the rail on the left.
  describe.runIf(server.browser === "chromium")("on a notched screen", () => {
    beforeEach(() =>
      notchedPhone({ bottom: 21, left: NOTCH_LEFT_PX, right: 47, top: 0 })
    );
    afterEach(clearSafeAreaInsets);

    it("centres a row's icon in the rail's visible card", async () => {
      const { button, icon, inner } = await foldedRow();
      expect(centre(icon)).toBeCloseTo(centre(inner), 0);
      expect(centre(button)).toBeCloseTo(centre(inner), 0);
    });
  });

  it("draws the icon at 22px in a 40px square", async () => {
    const { button, icon } = await foldedRow();
    expect(button.getBoundingClientRect().width).toBe(FOLDED_SQUARE_PX);
    expect(icon.getBoundingClientRect().width).toBe(FOLDED_ICON_PX);
  });
});

describe("a floating sidebar reads the Design's frame tokens", () => {
  afterEach(() => {
    for (const name of FRAME_TOKENS) {
      document.documentElement.style.removeProperty(name);
    }
  });

  it("pads the frame by --frame-gap, and by shadcn's 8px without it", async () => {
    declareFrame({ "--frame-gap": "1rem" });
    const { container } = await frameParts("floating");
    expect(getComputedStyle(container).padding).toBe("16px");
    document.documentElement.style.removeProperty("--frame-gap");
    expect(getComputedStyle(container).padding).toBe("8px");
  });

  it("rounds the frame by --frame-radius, and by shadcn's large radius without it", async () => {
    declareFrame({ "--frame-radius": "20px" });
    const { inner } = await frameParts("floating");
    expect(getComputedStyle(inner).borderRadius).toBe("20px");
    document.documentElement.style.removeProperty("--frame-radius");
    expect(getComputedStyle(inner).borderRadius).toBe(
      computedValue("border-radius", "var(--radius-lg)")
    );
  });

  it("casts --frame-shadow, and shadcn's small shadow without it", async () => {
    declareFrame({ "--frame-shadow": "0 0 0 4px rgb(1 2 3)" });
    const { inner } = await frameParts("floating");
    expect(getComputedStyle(inner).boxShadow).toContain("rgb(1, 2, 3)");
    document.documentElement.style.removeProperty("--frame-shadow");
    expect(getComputedStyle(inner).boxShadow).toContain(SHADCN_FLOATING_SHADOW);
  });

  it("leaves a collapsed frame's gap the rail plus the gap on both sides", async () => {
    declareFrame({ "--frame-gap": "1rem" });
    const { gap } = await frameParts("floating", false);
    const rail = RAIL_PX;
    const settled = await afterTransitions(gap);
    expect(Number.parseFloat(settled.width)).toBe(rail + 2 * 16);
  });

  it("is ignored by the sidebar variant, the Back Office's", async () => {
    declareFrame({
      "--frame-gap": "1rem",
      "--frame-radius": "20px",
      "--frame-shadow": "0 0 0 4px rgb(1 2 3)",
    });
    const { container, inner } = await frameParts("sidebar");
    expect(getComputedStyle(container).padding).toBe("0px");
    expect(getComputedStyle(inner).borderRadius).toBe("0px");
    expect(getComputedStyle(inner).boxShadow).toBe("none");
  });
});
