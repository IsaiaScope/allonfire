// @module-tag integration

import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { formatTime } from "@allonfire/core/shared/utils/format-time";
import { svgDataUrl } from "@allonfire/core/shared/utils/svg-data-url";
import { OCEAN_ART } from "@allonfire/design/designs/ocean/mascot-art";
import { page, userEvent } from "vitest/browser";
import { LAURA } from "@/shared/constants/laura";
import { MASCOT } from "@/shared/constants/mascots";
import { inOrder } from "@/shared/tests/in-order";
import { renderInApp } from "@/shared/tests/render-in-app";
import { enT } from "@/shared/tests/translators";
import type { SubmitView } from "../../utils/submit-view";
import { GameCompleteDialog } from "../game-complete-dialog";

vi.mock("@allonfire/ui/shared/components/aof-image", async () => ({
  AOFImage: (await import("@allonfire/ui/shared/tests/image-mock")).ImageMock,
}));

const MOVES = 9;
const TIME_MS = 65_000;
const SAVED = {
  id: "s",
  isGlobalBest: true,
  isPersonalBest: true,
  rank: 2,
};
/** The board's compact action (`COMPACT_ACTION`) is `h-8`: two rem, whatever the root's size. */
const COMPACT_REM = 2;
const compactPx = () =>
  COMPACT_REM *
  Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
/** A tablet's width: past `sm`, where the actions sit on one line. */
const TABLET = { HEIGHT: 1024, WIDTH: SCREEN.BREAKPOINT.MD };

const open = (
  submit: SubmitView,
  handlers: Partial<{
    retry: () => void;
    again: () => void;
    change: (open: boolean) => void;
  }> = {}
) =>
  renderInApp({
    children: (
      <GameCompleteDialog
        moves={MOVES}
        onOpenChange={handlers.change ?? vi.fn()}
        onPlayAgain={handlers.again ?? vi.fn()}
        onRetry={handlers.retry ?? vi.fn()}
        open
        submit={submit}
        timeMs={TIME_MS}
      />
    ),
  });

/** Draws at `size` for one test, then puts the window back. */
const resizeTo = async (
  size: { HEIGHT: number; WIDTH: number },
  onTestFinished: (done: () => Promise<void>) => void
) => {
  const { innerHeight, innerWidth } = window;
  await page.viewport(size.WIDTH, size.HEIGHT);
  onTestFinished(() => page.viewport(innerWidth, innerHeight));
};

const dialog = () => page.getByRole("dialog");
const inDialog = (selector: string) =>
  dialog().element().querySelector(selector);
const rect = (element: Element | null | undefined) =>
  element?.getBoundingClientRect() ?? new DOMRect();
const closeButton = () =>
  page.getByRole("button", { name: enT("Games.close") });
const againButton = () =>
  page.getByRole("button", { name: enT("Games.playAgain") });
const retryButton = () =>
  page.getByRole("button", { name: enT("Games.retry") });
const leaderboardLink = () =>
  page.getByRole("link", { name: enT("Games.viewLeaderboard") });
/** The badge a piece of text sits in. */
const badgeOf = (text: string) =>
  page.getByText(text, { exact: true }).element().closest("[data-slot=badge]");

describe("GameCompleteDialog figures and badges", () => {
  it("shows the time and the moves as labelled badges", async () => {
    await open({ state: "idle" });
    await expect.element(dialog()).toBeVisible();
    await expect
      .element(page.getByText(enT("Games.time"), { exact: true }))
      .toBeVisible();
    await expect.element(page.getByText(formatTime(TIME_MS))).toBeVisible();
    await expect
      .element(page.getByText(enT("Games.moves"), { exact: true }))
      .toBeVisible();
    await expect
      .element(page.getByText(String(MOVES), { exact: true }))
      .toBeVisible();
    expect(badgeOf(enT("Games.time"))).not.toBeNull();
    expect(badgeOf(enT("Games.moves"))).not.toBeNull();
  });
  it("shows the record, the personal best and the rank of a saved game as badges", async () => {
    await open({ score: SAVED, state: "saved" });
    await expect.element(page.getByText(enT("Games.newRecord"))).toBeVisible();
    await expect
      .element(page.getByText(enT("Games.personalBest")))
      .toBeVisible();
    await expect
      .element(page.getByText(enT("Games.rank"), { exact: true }))
      .toBeVisible();
    await expect
      .element(page.getByText(String(SAVED.rank), { exact: true }))
      .toBeVisible();
  });
  it("lets a long label take two lines and no more, and its badge grow to fit", async () => {
    await open({ score: SAVED, state: "saved" });
    const texts = [
      enT("Games.newRecord"),
      enT("Games.personalBest"),
      enT("Games.rank"),
      enT("Games.time"),
      enT("Games.moves"),
    ];
    for (const text of texts) {
      const label = page.getByText(text, { exact: true }).element();
      expect(getComputedStyle(label).webkitLineClamp).toBe("2");
      const badge = badgeOf(text);
      expect(
        Number.parseFloat(getComputedStyle(badge ?? label).minHeight)
      ).toBeGreaterThan(0);
      expect(getComputedStyle(badge ?? label).height).not.toBe("");
    }
  });
  it("draws each badge with its own colour emoji", async () => {
    await open({ score: SAVED, state: "saved" });
    const pictures = [
      ...(inDialog("[data-slot=memory-result]")?.querySelectorAll(
        "[data-testid=picture]"
      ) ?? []),
    ].map((picture) => picture.getAttribute("data-src"));
    expect(pictures).toEqual([
      svgDataUrl(OCEAN_ART[MASCOT.GAMES.BADGE_RECORD].SVG),
      svgDataUrl(OCEAN_ART[MASCOT.GAMES.BADGE_PERSONAL_BEST].SVG),
      svgDataUrl(OCEAN_ART[MASCOT.GAMES.BADGE_RANK].SVG),
    ]);
  });
  it("tells the badges apart by colour, all of the Design's own", async () => {
    await open({ score: SAVED, state: "saved" });
    const colours = [
      badgeOf(enT("Games.newRecord")),
      badgeOf(enT("Games.personalBest")),
      badgeOf(enT("Games.rank")),
    ].map((badge) =>
      badge ? getComputedStyle(badge).backgroundColor : "missing"
    );
    expect(new Set(colours).size).toBe(3);
  });
});

describe("GameCompleteDialog saving and the leaderboard link", () => {
  it("tells the game is being saved inside Play again: a spinner and the words, busy and not clickable", async () => {
    await open({ state: "submitting" });
    const saving = page.getByRole("button", {
      name: enT("Games.submitting"),
    });
    await expect.element(saving).toBeVisible();
    await expect.element(saving).toBeDisabled();
    await expect.element(saving).toHaveAttribute("aria-busy", "true");
    expect(saving.element().querySelector("svg[class*=loader]")).not.toBeNull();
    expect(againButton().elements()).toHaveLength(0);
  });
  it("keeps the saving words for a screen reader only in the results region", async () => {
    await open({ state: "submitting" });
    const note = inDialog("[data-slot=memory-result] p");
    expect(note?.textContent).toBe(enT("Games.submitting"));
    expect(note ? getComputedStyle(note).position : "").toBe("absolute");
  });
  it("gives Play again back, enabled, once saving ends", async () => {
    await open({ score: SAVED, state: "saved" });
    await expect.element(againButton()).toBeEnabled();
    expect(
      page.getByRole("button", { name: enT("Games.submitting") }).elements()
    ).toHaveLength(0);
  });
  it("lines the leaderboard link up with the badges' left edge", async () => {
    await open({ state: "idle" });
    const time = badgeOf(enT("Games.time"));
    expect(
      Math.abs(rect(leaderboardLink().element()).left - rect(time).left)
    ).toBeLessThan(2);
  });
  it("underlines the leaderboard link", async () => {
    await open({ state: "idle" });
    expect(
      getComputedStyle(leaderboardLink().element()).textDecorationLine
    ).toContain("underline");
  });
  it("links to the leaderboard under the badges, in the body and not in the footer", async () => {
    await open({ score: SAVED, state: "saved" });
    await expect
      .element(leaderboardLink())
      .toHaveAttribute("href", expect.stringContaining(LAURA.PAGE.LEADERBOARD));
    const footer = inDialog("[data-slot=dialog-footer]");
    expect(footer?.contains(leaderboardLink().element())).toBe(false);
    expect(rect(leaderboardLink().element()).top).toBeGreaterThanOrEqual(
      rect(inDialog("[data-slot=memory-result]")).bottom
    );
  });
  it("draws the leaderboard link with the trophy's colour emoji, as the record badge does", async () => {
    await open({ state: "idle" });
    expect(
      leaderboardLink()
        .element()
        .querySelector("[data-testid=picture]")
        ?.getAttribute("data-src")
    ).toBe(svgDataUrl(OCEAN_ART[MASCOT.GAMES.BADGE_RECORD].SVG));
  });
});

describe("GameCompleteDialog problems and retry", () => {
  it("puts a themed retry in the band's top right when saving failed, small like the board's New game", async () => {
    const retry = vi.fn();
    await open({ state: "failed" }, { retry });
    const button = retryButton().element();
    if (!(button instanceof HTMLElement)) {
      throw new Error("Try again is not a button");
    }
    const band = inDialog("div.bg-ink");
    expect(band?.contains(button)).toBe(true);
    const box = rect(button);
    // The layout box: the dialog's zoom-in is still drawing when this runs.
    expect(button.offsetWidth).toBeCloseTo(compactPx(), 0);
    expect(button.offsetHeight).toBeCloseTo(compactPx(), 0);
    expect(rect(band).right - box.right).toBeLessThan(compactPx());
    expect(getComputedStyle(button).fontWeight).toBe("700");
    expect(button.querySelector("span[aria-hidden]")).not.toBeNull();
    await retryButton().click();
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("offers no retry unless saving failed", async () => {
    await open({ score: SAVED, state: "saved" });
    expect(retryButton().elements()).toHaveLength(0);
  });

  it("tells a failed save in an alert inside the dialog", async () => {
    await open({ state: "failed" });
    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent(enT("Games.submitError"));
  });

  it("tells a game that could not be played in the same alert, with no retry", async () => {
    await open({ state: "notRecorded" });
    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent(enT("Games.notRecorded"));
    expect(retryButton().elements()).toHaveLength(0);
  });

  it("tells a save the Session no longer allows in the same alert, with no retry: trying again never works", async () => {
    await open({ state: "refused" });
    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent(enT("Games.refused"));
    expect(retryButton().elements()).toHaveLength(0);
  });

  it("keeps the alert empty while nothing went wrong", async () => {
    await open({ score: SAVED, state: "saved" });
    expect(page.getByRole("alert").element().textContent).toBe("");
  });
});

describe("GameCompleteDialog actions and dressing", () => {
  it("has no close button in the corner: Close is in the footer, left of Play again", async ({
    onTestFinished,
  }) => {
    await resizeTo(SCREEN.VIEWPORT.DESKTOP, onTestFinished);
    const change = vi.fn();
    await open({ state: "idle" }, { change });
    expect(inDialog("[data-slot=dialog-close]")).toBeNull();
    const footer = inDialog("[data-slot=dialog-footer]");
    expect(footer?.contains(closeButton().element())).toBe(true);
    expect(footer?.contains(againButton().element())).toBe(true);
    expect(rect(closeButton().element()).right).toBeLessThanOrEqual(
      rect(againButton().element()).left
    );
    await closeButton().click();
    expect(change.mock.calls[0]?.[0]).toBe(false);
  });

  it("closes on Escape, and Play again starts a new game", async () => {
    const change = vi.fn();
    const again = vi.fn();
    await open({ state: "idle" }, { again, change });
    await userEvent.keyboard("{Escape}");
    expect(change.mock.calls[0]?.[0]).toBe(false);
    await againButton().click();
    expect(again).toHaveBeenCalledTimes(1);
  });

  it.for([
    ["stacks on a phone", SCREEN.VIEWPORT.PHONE, true],
    ["sits on one line on a tablet", TABLET, false],
    ["sits on one line on a desktop", SCREEN.VIEWPORT.DESKTOP, false],
  ] as const)(
    "the footer's buttons %s, as the delete dialog's do",
    async ([_name, size, stacked], { onTestFinished }) => {
      await resizeTo(size, onTestFinished);
      await open({ state: "idle" });
      await expect.element(againButton()).toBeVisible();
      const close = rect(closeButton().element());
      const again = rect(againButton().element());
      if (stacked) {
        // The act sits on top, Close under it, as in a column of the delete dialog.
        expect(again.bottom).toBeLessThanOrEqual(close.top + 1);
      } else {
        expect(Math.abs(again.top - close.top)).toBeLessThan(2);
        expect(close.right).toBeLessThanOrEqual(again.left);
      }
    }
  );

  it("is dressed as the delete-photo alert: Laura's octopus on a band of ink, beside the title", async () => {
    await open({ state: "idle" });
    const title = page
      .getByRole("heading", { name: enT("Games.gameComplete") })
      .element();
    const band = title.closest("div.bg-ink");
    expect(band).not.toBeNull();
    expect(
      band?.querySelector("[data-testid=picture]")?.getAttribute("data-src")
    ).toBe(svgDataUrl(OCEAN_ART[MASCOT.APP].SVG));
  });

  it("dresses Close and Play again as Laura's action buttons, each with an icon and its own picture of the sea", async () => {
    await open({ state: "idle" });
    const actions = [closeButton(), againButton()].map((action) =>
      action.element()
    );
    for (const action of actions) {
      expect(getComputedStyle(action).fontWeight).toBe("700");
      expect(action.querySelector("svg")).not.toBeNull();
    }
    const art = actions.map((action) =>
      action.querySelector("span[aria-hidden]")?.getAttribute("style")
    );
    expect(new Set(art).size).toBe(actions.length);
  });
});

describe("GameCompleteDialog while the score is saved", () => {
  const PHONE = { HEIGHT: 844, WIDTH: 390 };
  const heightWith = async (submit: SubmitView) => {
    const screen = await open(submit);
    await vi.waitFor(() => {
      if (!dialog().element()) {
        throw new Error("not drawn yet");
      }
    });
    await document.fonts.ready;
    // The popup grows in as it opens: measure it once that has stopped (a
    // placeholder's pulse never does).
    const popup = dialog().element();
    await Promise.all(
      popup
        .getAnimations({ subtree: true })
        .filter(
          (motion) =>
            motion.effect?.getComputedTiming().iterations !==
            Number.POSITIVE_INFINITY
        )
        .map((motion) => motion.finished)
    );
    const { height } = rect(popup);
    await screen.unmount();
    return height;
  };
  it.for([
    ["a phone", PHONE],
    ["a tablet", TABLET],
  ] as const)(
    "keeps its height on %s from saving to saved, whichever badges were earned",
    async ([_name, size], { onTestFinished }) => {
      await resizeTo(size, onTestFinished);
      const saving = await heightWith({ state: "submitting" });
      await inOrder(
        [
          SAVED,
          { ...SAVED, isGlobalBest: false },
          { ...SAVED, isGlobalBest: false, isPersonalBest: false },
        ],
        async (score) => {
          expect(await heightWith({ score, state: "saved" })).toBeCloseTo(
            saving,
            0
          );
        }
      );
    }
  );
  it("draws faint placeholders for the badges while saving, hidden from a screen reader", async () => {
    await open({ state: "submitting" });
    const holders = dialog()
      .element()
      .querySelectorAll("[data-slot=memory-result] [data-placeholder]");
    expect(holders).toHaveLength(3);
    for (const holder of holders) {
      expect(holder.closest("[aria-hidden=true]")).not.toBeNull();
    }
  });
});
