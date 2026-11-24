// @module-tag integration
import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { useCallback, useState } from "react";
import { Toaster, toast } from "sonner";
import { page, server, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  clearSafeAreaInsets,
  notchedPhone,
} from "../../../shared/tests/emulated-media";
import { AOFLightbox } from "../components/aof-lightbox";

const LABELS = {
  close: "Close the photo",
  next: "Next photo",
  position: "Photo {index} of {total}",
  previous: "Previous photo",
  title: "Photos",
};
const COUNT = 3;
/** A phone turned sideways: the sensor housing's width on both sides. */
const NOTCH = { bottom: 21, left: 59, right: 59, top: 0 } as const;
const GUTTER_PX = 24;
/** The air between two controls of the capsule. */
const MIN_GAP_PX = 8;
/** A pull that is plainly meant to close, and one that is not. */
const PULL_PX = 300;
const SHORT_PULL_PX = 12;
const PULL_STEPS = 10;
const SETTLE_MS = 600;

const onIndexChange = vi.fn();
const onOpenChange = vi.fn();

const renderSlide = (index: number) => (
  <p data-testid={`slide-${index + 1}`}>Slide {index + 1}</p>
);

/** The lightbox as an App holds it: the opener, the open state and the index. */
const Harness = ({
  paused = false,
  start = 1,
}: {
  paused?: boolean;
  start?: number | undefined;
}) => {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(start);
  const openIt = useCallback(() => setOpen(true), []);
  const changeIndex = useCallback((next: number) => {
    onIndexChange(next);
    setIndex(next);
  }, []);
  const changeOpen = useCallback((next: boolean) => {
    onOpenChange(next);
    setOpen(next);
  }, []);
  return (
    <>
      <button onClick={openIt} type="button">
        Open photos
      </button>
      <AOFLightbox
        actions={<button type="button">Heart</button>}
        caption={<p>A caption</p>}
        count={COUNT}
        index={index}
        labels={LABELS}
        onIndexChange={changeIndex}
        onOpenChange={changeOpen}
        open={open}
        paused={paused}
        renderSlide={renderSlide}
      />
      <button type="button">Outside</button>
    </>
  );
};

const openIt = async (start?: number, paused = false) => {
  const screen = await render(<Harness paused={paused} start={start} />);
  // Opened as a keyboard visitor does: Safari gives a clicked button no focus,
  // so there would be nothing for the lightbox to hand focus back to.
  screen.getByRole("button", { name: "Open photos" }).element().focus();
  await userEvent.keyboard("{Enter}");
  await vi.waitFor(() => screen.getByRole("dialog").element());
  return screen;
};

beforeEach(async () => {
  onIndexChange.mockClear();
  onOpenChange.mockClear();
  await page.viewport(
    SCREEN.VIEWPORT.DESKTOP.WIDTH,
    SCREEN.VIEWPORT.DESKTOP.HEIGHT
  );
});

describe("AOFLightbox", () => {
  it("opens at the index, named by its title, showing the slide the App draws", async () => {
    const screen = await openIt(1);
    await expect
      .element(screen.getByRole("dialog", { name: LABELS.title }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("group", { name: "Photo 2 of 3" }))
      .toBeVisible();
    await expect.element(screen.getByTestId("slide-2")).toBeVisible();
    await expect.element(screen.getByText("A caption")).toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "Heart" }))
      .toBeVisible();
  });

  it("announces the position politely", async () => {
    const screen = await openIt(1);
    const carousel = screen.getByRole("region");
    expect(carousel.element().getAttribute("aria-live")).toBe("polite");
    await expect
      .element(screen.getByRole("group", { name: "Photo 2 of 3" }))
      .toBeVisible();
  });

  it("goes to the next photo on ArrowRight and the previous on ArrowLeft", async () => {
    const screen = await openIt(1);
    await userEvent.keyboard("{ArrowRight}");
    await vi.waitFor(() => expect(onIndexChange).toHaveBeenLastCalledWith(2));
    await expect
      .element(screen.getByRole("group", { name: "Photo 3 of 3" }))
      .toBeVisible();
    await userEvent.keyboard("{ArrowLeft}");
    await vi.waitFor(() => expect(onIndexChange).toHaveBeenLastCalledWith(1));
  });

  it("does nothing on ArrowLeft at the first photo or ArrowRight at the last", async () => {
    await openIt(0);
    await userEvent.keyboard("{ArrowLeft}");
    expect(onIndexChange).not.toHaveBeenCalled();
    await userEvent.keyboard("{ArrowRight}");
    await vi.waitFor(() => expect(onIndexChange).toHaveBeenCalledTimes(1));
    await userEvent.keyboard("{ArrowRight}");
    await vi.waitFor(() => expect(onIndexChange).toHaveBeenCalledTimes(2));
    await userEvent.keyboard("{ArrowRight}");
    expect(onIndexChange.mock.calls.map(([index]) => index)).toEqual([1, 2]);
  });

  it("disables previous at the start and next at the end", async () => {
    const screen = await openIt(0);
    await expect
      .element(screen.getByRole("button", { name: LABELS.previous }))
      .toBeDisabled();
    await expect
      .element(screen.getByRole("button", { name: LABELS.next }))
      .toBeEnabled();
    // The library takes one key press at a time while it animates.
    await userEvent.keyboard("{ArrowRight}");
    await vi.waitFor(() => expect(onIndexChange).toHaveBeenCalledTimes(1));
    await userEvent.keyboard("{ArrowRight}");
    await expect
      .element(screen.getByRole("button", { name: LABELS.next }))
      .toBeDisabled();
  });

  it("gives focus back to the button that opened it after Tab moved focus inside", async () => {
    const screen = await openIt(1);
    await userEvent.tab();
    await userEvent.tab();
    // A tip a focused control shows takes the first Escape.
    await userEvent.keyboard("{Escape}");
    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() =>
      expect(onOpenChange).toHaveBeenLastCalledWith(false)
    );
    await expect
      .element(screen.getByRole("button", { name: "Open photos" }))
      .toHaveFocus();
  });

  it("closes on Escape and gives focus back to the button that opened it", async () => {
    const screen = await openIt(1);
    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() =>
      expect(onOpenChange).toHaveBeenLastCalledWith(false)
    );
    await expect
      .element(screen.getByRole("button", { name: "Open photos" }))
      .toHaveFocus();
  });

  it("closes from its own labelled button", async () => {
    const screen = await openIt(1);
    await screen.getByRole("button", { name: LABELS.close }).click();
    await vi.waitFor(() =>
      expect(onOpenChange).toHaveBeenLastCalledWith(false)
    );
  });

  // WebKit's Tab skips buttons unless Safari's "highlight each item" is on
  // (the same as a default Safari), so there is no Tab stop to keep inside.
  it.skipIf(server.browser === "webkit")(
    "keeps Tab and Shift+Tab inside the lightbox",
    async () => {
      const screen = await openIt(1);
      const dialog = screen.getByRole("dialog").element();
      // The library moves focus a tick after a key press.
      const insideDialog = () =>
        vi.waitFor(() => {
          if (!dialog.contains(document.activeElement)) {
            throw new Error("focus left the lightbox");
          }
        });
      const press = async () => {
        await userEvent.tab();
        await insideDialog();
      };
      // One press after the other: each starts from where the last left the focus.
      await Array.from({ length: 12 }).reduce<Promise<void>>(
        (done) => done.then(press),
        Promise.resolve()
      );
      await userEvent.tab({ shift: true });
      await insideDialog();
    }
  );
});

/** A control that appears in the page after the lightbox opened, as an App's dialog does. */
const addLateButton = () => {
  const late = document.createElement("button");
  late.textContent = "Late";
  document.body.append(late);
  late.focus();
  return late;
};

// WebKit's Tab skips buttons (a default Safari), so there is no Tab to trap.
describe.skipIf(server.browser === "webkit")(
  "AOFLightbox beneath a dialog of its App",
  () => {
    /** Tab from a control that appeared after it opened, and whether focus ended inside. */
    const tabFromLateButton = async (paused: boolean) => {
      const screen = await openIt(1, paused);
      const dialog = screen.getByRole("dialog").element();
      const late = addLateButton();
      await userEvent.tab();
      const inside = dialog.contains(document.activeElement);
      late.remove();
      return inside;
    };

    it("pulls Tab back inside while it holds focus", async () => {
      expect(await tabFromLateButton(false)).toBe(true);
    });

    it("lets Tab go on to the dialog above it while paused", async () => {
      expect(await tabFromLateButton(true)).toBe(false);
    });
  }
);

describe("AOFLightbox controls", () => {
  it("holds the actions and Close in one capsule", async () => {
    const screen = await openIt(1);
    const capsule = (name: string) =>
      screen
        .getByRole("button", { name })
        .element()
        .closest('[data-slot="control-bar"]');
    expect(capsule("Heart")).not.toBeNull();
    expect(capsule(LABELS.close)).toBe(capsule("Heart"));
  });

  it("puts the capsule at the bottom middle and the caption at the top middle", async () => {
    const screen = await openIt(1);
    const middle = window.innerWidth / 2;
    const capsule = screen
      .getByRole("button", { name: LABELS.close })
      .element()
      .closest('[data-slot="control-bar"]')
      ?.getBoundingClientRect();
    const caption = screen
      .getByText("A caption")
      .element()
      .getBoundingClientRect();
    expect(capsule).toBeDefined();
    expect((capsule?.left ?? 0) + (capsule?.width ?? 0) / 2).toBeCloseTo(
      middle,
      0
    );
    expect(capsule?.top ?? 0).toBeGreaterThan(window.innerHeight / 2);
    expect(caption.left + caption.width / 2).toBeCloseTo(middle, 0);
    expect(caption.bottom).toBeLessThan(window.innerHeight / 2);
  });

  it("spaces the capsule's controls out and keeps them centred in it", async () => {
    const screen = await openIt(1);
    const capsule = screen
      .getByRole("button", { name: LABELS.close })
      .element()
      .closest('[data-slot="control-bar"]');
    const edges = capsule?.getBoundingClientRect();
    const buttons = [...(capsule?.querySelectorAll("button") ?? [])].map(
      (button) => button.getBoundingClientRect()
    );
    const [first, second] = buttons;
    const last = buttons.at(-1);
    expect(edges && first && second && last).toBeTruthy();
    // Equal room on both sides of the row.
    expect((first?.left ?? 0) - (edges?.left ?? 0)).toBeCloseTo(
      (edges?.right ?? 0) - (last?.right ?? 0),
      0
    );
    // A little air between neighbours: 8px or more.
    expect((second?.left ?? 0) - (first?.right ?? 0)).toBeGreaterThanOrEqual(
      MIN_GAP_PX
    );
  });

  it.each([
    ["Close", LABELS.close],
    ["Previous", LABELS.previous],
    ["Next", LABELS.next],
  ])("names the %s button in a tip", async (_, name) => {
    const screen = await openIt(1);
    await userEvent.hover(screen.getByRole("button", { name }));
    await expect.element(screen.getByText(name, { exact: true })).toBeVisible();
  });

  it("shows the arrows from a tablet up and hides them on a phone", async () => {
    const screen = await openIt(1);
    await expect
      .element(screen.getByRole("button", { name: LABELS.next }))
      .toBeVisible();
    await page.viewport(
      SCREEN.VIEWPORT.PHONE.WIDTH,
      SCREEN.VIEWPORT.PHONE.HEIGHT
    );
    // Hidden, so it leaves the accessibility tree: found by its label.
    await expect.element(screen.getByLabelText(LABELS.next)).not.toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: LABELS.close }))
      .toBeVisible();
  });
});

/** A finger drawn straight from `from` to `to` on the lightbox, by pointer events. */
const drag = (from: [number, number], to: [number, number]) => {
  // On the photo, where a finger lands: the event bubbles up to the library.
  const photo = document.querySelector('[data-testid="slide-2"]');
  const fire = (type: string, [clientX, clientY]: [number, number]) =>
    photo?.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        // The library reads no buttons held as a finger lifted.
        buttons: type === "pointerup" ? 0 : 1,
        clientX,
        clientY,
        isPrimary: true,
        pointerId: 1,
        pointerType: "touch",
      })
    );
  fire("pointerdown", from);
  for (let step = 1; step <= PULL_STEPS; step += 1) {
    fire("pointermove", [
      from[0] + ((to[0] - from[0]) * step) / PULL_STEPS,
      from[1] + ((to[1] - from[1]) * step) / PULL_STEPS,
    ]);
  }
  fire("pointerup", to);
};

describe("AOFLightbox pulled up or down", () => {
  const MIDDLE: [number, number] = [400, 400];

  it("closes when the photo is pulled down", async () => {
    await openIt(1);
    drag(MIDDLE, [400, 400 + PULL_PX]);
    await vi.waitFor(() =>
      expect(onOpenChange).toHaveBeenLastCalledWith(false)
    );
  });

  it("closes when the photo is pulled up", async () => {
    await openIt(1);
    drag(MIDDLE, [400, 400 - PULL_PX]);
    await vi.waitFor(() =>
      expect(onOpenChange).toHaveBeenLastCalledWith(false)
    );
  });

  it("stays open for a short pull, and a tap", async () => {
    await openIt(1);
    drag(MIDDLE, [400, 400 + SHORT_PULL_PX]);
    drag(MIDDLE, MIDDLE);
    // The library settles a cancelled pull with an animation.
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});

describe("AOFLightbox layer", () => {
  it("stays below a dialog of the shadcn layer (z-index 50)", async () => {
    await openIt(1);
    const portal = document.querySelector(".yarl__portal");
    const zIndex = Number(
      portal ? getComputedStyle(portal).zIndex : Number.NaN
    );
    expect(zIndex).toBeLessThan(50);
  });
});

// WebKit has no way to draw a notch.
describe.runIf(server.browser === "chromium")(
  "AOFLightbox on a notched screen",
  () => {
    beforeEach(async () => {
      await page.viewport(
        SCREEN.VIEWPORT.PHONE_LANDSCAPE.WIDTH,
        SCREEN.VIEWPORT.PHONE_LANDSCAPE.HEIGHT
      );
      await notchedPhone(NOTCH);
    });
    afterEach(clearSafeAreaInsets);

    it("centres the photo on the screen when only one side has a notch", async () => {
      await notchedPhone({ bottom: 0, left: NOTCH.left, right: 0, top: 0 });
      const screen = await openIt(1);
      const wrapper = screen.getByTestId("slide-2").element().parentElement;
      const box = wrapper?.getBoundingClientRect();
      const style = wrapper ? getComputedStyle(wrapper) : undefined;
      const left =
        (box?.left ?? 0) + Number.parseFloat(style?.paddingLeft ?? "0");
      const right =
        window.innerWidth -
        ((box?.right ?? 0) - Number.parseFloat(style?.paddingRight ?? "0"));
      expect(Math.abs(left - right)).toBeLessThanOrEqual(1);
    });

    it("opens the photo inside the safe edges, never under the notch", async () => {
      const screen = await openIt(1);
      const box = screen
        .getByTestId("slide-2")
        .element()
        .getBoundingClientRect();
      expect({
        left: box.left >= NOTCH.left,
        right: box.right <= window.innerWidth - NOTCH.right,
        top: box.top >= GUTTER_PX,
      }).toEqual({ left: true, right: true, top: true });
    });

    it("keeps its controls inside the safe edges", async () => {
      const screen = await openIt(1);
      for (const name of [LABELS.close, LABELS.previous, LABELS.next]) {
        const box = screen
          .getByRole("button", { name })
          .element()
          .getBoundingClientRect();
        expect({
          bottom:
            box.bottom > window.innerHeight - Math.max(GUTTER_PX, NOTCH.bottom),
          left: box.left < Math.max(GUTTER_PX, NOTCH.left),
          name,
          right:
            box.right > window.innerWidth - Math.max(GUTTER_PX, NOTCH.right),
        }).toEqual({ bottom: false, left: false, name, right: false });
      }
    });
  }
);

describe("AOFLightbox over a toast", () => {
  it("leaves a toast sent while it is open reachable: its close button works", async () => {
    const screen = await render(
      <>
        <Toaster closeButton />
        <Harness />
      </>
    );
    screen.getByRole("button", { name: "Open photos" }).element().focus();
    await userEvent.keyboard("{Enter}");
    await vi.waitFor(() => screen.getByRole("dialog").element());
    toast("The favorite could not be saved.", {
      duration: Number.POSITIVE_INFINITY,
    });
    const message = screen.getByText("The favorite could not be saved.");
    await expect.element(message).toBeVisible();
    await screen.getByRole("button", { name: "Close toast" }).click();
    await expect.element(message).not.toBeInTheDocument();
  });
});
