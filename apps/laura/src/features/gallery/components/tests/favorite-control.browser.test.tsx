// @module-tag integration

import { QUIET_MS } from "@allonfire/ui/features/query/hooks/use-aof-quiet-toggle";
import {
  afterTransitions,
  computedValue,
} from "@allonfire/ui/shared/tests/computed-style";
import { page, server, userEvent } from "vitest/browser";
import { renderInApp } from "@/shared/tests/render-in-app";
import { enT } from "@/shared/tests/translators";
import { setFavorite } from "../../actions/favorite";
import { FavoriteControl } from "../favorite-control";

vi.mock("../../actions/favorite", () => ({ setFavorite: vi.fn() }));
vi.mock("../../actions/remove-photo", () => ({ removePhoto: vi.fn() }));

const ID = "photo-a";
const TWO_PIXEL_RING = /0px 0px 0px 2px/;
/** Every blur in the filter is 1px or 2px. */
const TWO_PIXEL_BLUR_AT_MOST = /^(?:.*?\) 0px [01]px [12]px\b.*)$/;
/** The action held open, for a test to answer when it wants. */
let answer: (value: { favorite: boolean } | null) => void = () => undefined;
const held = () =>
  new Promise<{ favorite: boolean } | null>((resolve) => {
    answer = resolve;
  });

/** Lets the quiet that follows a burst of taps run out, on the fake clock. */
const quiet = () => vi.advanceTimersByTimeAsync(QUIET_MS * 2);

/** The heart whose next tap marks the photo, and the one whose next tap clears it. */
const add = () =>
  page.getByRole("button", {
    name: enT("Gallery.favorite.toggle"),
    pressed: false,
  });
const remove = () =>
  page.getByRole("button", {
    name: enT("Gallery.favorite.toggle"),
    pressed: true,
  });

afterEach(() => vi.useRealTimers());

beforeEach(() => {
  vi.mocked(setFavorite).mockReset().mockImplementation(held);
});

describe("FavoriteControl for an Admin", () => {
  it("is an unpressed button named to add, and a pressed one named to remove", async () => {
    await renderInApp({
      children: <FavoriteControl canMark favorite={false} imageId={ID} />,
    });
    await expect.element(add()).toHaveAttribute("aria-pressed", "false");
    await renderInApp({
      children: <FavoriteControl canMark favorite imageId={ID} />,
    });
    await expect.element(remove()).toHaveAttribute("aria-pressed", "true");
  });

  it("stays a bare heart under a pointer: no square behind it", async () => {
    await renderInApp({
      children: <FavoriteControl canMark favorite={false} imageId={ID} />,
    });
    await userEvent.hover(add());
    const style = getComputedStyle(add().element());
    expect(style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
  });

  it("draws the heart in the theme's blue on a photo, and keeps it under a pointer", async () => {
    await renderInApp({
      children: <FavoriteControl canMark favorite={false} imageId={ID} />,
    });
    const blue = computedValue("color", "var(--primary)");
    expect(getComputedStyle(add().element()).color).toBe(blue);
    // The ghost button turns its text to the foreground on hover (and a touch
    // screen keeps the hover after a tap): the heart stays blue.
    await userEvent.hover(add());
    expect((await afterTransitions(add().element())).color).toBe(blue);
  });

  it("keeps a Favorite's heart coral under a pointer", async () => {
    await renderInApp({
      children: <FavoriteControl canMark favorite imageId={ID} />,
    });
    await userEvent.hover(remove());
    expect((await afterTransitions(remove().element())).color).toBe(
      computedValue("color", "var(--coral)")
    );
  });

  it("casts a dark, tight shadow so the heart reads on a pale photo", async () => {
    await renderInApp({
      children: <FavoriteControl canMark favorite={false} imageId={ID} />,
    });
    const heart = add().element().querySelector("svg");
    const filter = heart ? getComputedStyle(heart).filter : "";
    expect(filter).toContain("drop-shadow");
    expect(filter).toContain(computedValue("color", "var(--ink)"));
    expect(filter).toMatch(TWO_PIXEL_BLUR_AT_MOST);
    // One shadow, not two stacked.
    expect(filter.match(/drop-shadow/g)).toHaveLength(1);
  });

  it("shows a sharp two-pixel ring in the theme's blue on keyboard focus", async ({
    skip,
  }) => {
    // WebKit's Tab skips buttons (a default Safari), so it has no keyboard focus to draw.
    skip(server.browser === "webkit", "Tab skips buttons in WebKit");
    await renderInApp({
      children: <FavoriteControl canMark favorite={false} imageId={ID} />,
    });
    await userEvent.tab();
    await expect.element(add()).toHaveFocus();
    const ring = (await afterTransitions(add().element())).boxShadow;
    expect(ring).toContain(computedValue("color", "var(--primary)"));
    expect(ring).toMatch(TWO_PIXEL_RING);
  });

  it("names itself in a tip under a pointer", async () => {
    await renderInApp({
      children: <FavoriteControl canMark favorite={false} imageId={ID} />,
    });
    await userEvent.hover(add());
    await expect
      .element(page.getByText(enT("Gallery.favorite.add"), { exact: true }))
      .toBeVisible();
  });

  it("reads in the text colour on a bar, where white would vanish on the card", async () => {
    await renderInApp({
      children: (
        <FavoriteControl canMark favorite={false} imageId={ID} surface="bar" />
      ),
    });
    expect(getComputedStyle(add().element()).color).toBe(
      computedValue("color", "var(--foreground)")
    );
    const heart = add().element().querySelector("svg");
    expect(heart ? getComputedStyle(heart).filter : "").toBe("none");
  });
});

describe("FavoriteControl's clicks for an Admin", () => {
  it("flips at once on a click and sends the new state", async () => {
    await renderInApp({
      children: <FavoriteControl canMark favorite={false} imageId={ID} />,
    });
    await add().click();
    await expect.element(remove()).toHaveAttribute("aria-pressed", "true");
    await vi.waitFor(() => expect(setFavorite).toHaveBeenCalledWith(ID, true));
  });

  it("goes back and says so when the action is refused", async () => {
    await renderInApp({
      children: <FavoriteControl canMark favorite={false} imageId={ID} />,
    });
    await add().click();
    await vi.waitFor(() => expect(setFavorite).toHaveBeenCalledTimes(1));
    answer(null);
    await expect
      .element(page.getByText(enT("Gallery.favorite.failed")))
      .toBeVisible();
    await expect.element(add()).toHaveAttribute("aria-pressed", "false");
  });

  it("sends one call for a burst of clicks, the last state", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    vi.mocked(setFavorite).mockResolvedValue({ favorite: true });
    await renderInApp({
      children: <FavoriteControl canMark favorite={false} imageId={ID} />,
    });
    // Each tap flips the heart, so the next one finds it in the other state.
    await add().click();
    await remove().click();
    await add().click();
    await remove().click();
    await add().click();
    await expect.element(remove()).toHaveAttribute("aria-pressed", "true");
    expect(setFavorite).not.toHaveBeenCalled();
    await quiet();
    expect(vi.mocked(setFavorite).mock.calls).toEqual([[ID, true]]);
  });

  it("sends nothing when a burst ends where it began", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    await renderInApp({
      children: <FavoriteControl canMark favorite={false} imageId={ID} />,
    });
    await add().click();
    await remove().click();
    await expect.element(add()).toHaveAttribute("aria-pressed", "false");
    await quiet();
    expect(setFavorite).not.toHaveBeenCalled();
  });

  it("sends a click made while one is on its way after it, in order", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    await renderInApp({
      children: <FavoriteControl canMark favorite={false} imageId={ID} />,
    });
    await add().click();
    await quiet();
    expect(setFavorite).toHaveBeenCalledTimes(1);
    await remove().click();
    await expect.element(add()).toHaveAttribute("aria-pressed", "false");
    await quiet();
    expect(setFavorite).toHaveBeenCalledTimes(1);
    answer({ favorite: true });
    await vi.advanceTimersByTimeAsync(100);
    expect(vi.mocked(setFavorite).mock.calls).toEqual([
      [ID, true],
      [ID, false],
    ]);
  });
});

describe("FavoriteControl for a User", () => {
  it("shows a static mark on a Favorite, never a button", async () => {
    const screen = await renderInApp({
      children: (
        <div data-testid="host">
          <FavoriteControl canMark={false} favorite imageId={ID} />
        </div>
      ),
    });
    await expect
      .element(page.getByRole("img", { name: enT("Gallery.favorite.is") }))
      .toBeVisible();
    expect(
      screen.getByTestId("host").element().querySelector("button")
    ).toBeNull();
  });

  it("shows nothing on a photo that is not a Favorite", async () => {
    const screen = await renderInApp({
      children: (
        <div data-testid="host">
          <FavoriteControl canMark={false} favorite={false} imageId={ID} />
        </div>
      ),
    });
    await expect.element(screen.getByTestId("host")).toBeInTheDocument();
    expect(screen.getByTestId("host").element().childElementCount).toBe(0);
  });
});
