// @module-tag integration

import { worker } from "@allonfire/config/tests/browser/msw";
import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { MEMORY_RULE } from "@allonfire/database/features/apps/laura/constants/memory-rule";
import { AOFFreshOnReturn } from "@allonfire/ui/features/query/components/aof-fresh-on-return";
import { HttpResponse, http } from "msw";
import { Activity, useCallback, useState } from "react";
import { page, userEvent } from "vitest/browser";
import { inOrder } from "@/shared/tests/in-order";
import { DECK_URL, SCORE_BODY } from "@/shared/tests/msw/handlers";
import { renderInApp } from "@/shared/tests/render-in-app";
import { enT } from "@/shared/tests/translators";
import { submitMemoryScore } from "../../actions/submit-memory-score";
import { GAMES } from "../../constants/games";
import { answerBoard, boardFrame, counts } from "../../tests/board-mocks";
import { deckBody } from "../../tests/deck-body";
import { MemoryBoard } from "../memory-board";

vi.mock("@allonfire/ui/shared/components/aof-image", async () =>
  (await import("../../tests/board-mocks")).imageServerMock()
);
// A server action: covered for real by its own test and by e2e.
vi.mock("../../actions/submit-memory-score", () => ({
  submitMemoryScore: vi.fn(),
}));
// A deal in a known order, a pair after a pair, so a test can play it.
vi.mock("../../utils/deal-cards", async (original) => ({
  ...(await original<typeof import("../../utils/deal-cards")>()),
  dealCards: (images: readonly { id: string }[]) =>
    images.flatMap((image) =>
      ["a", "b"].map((side) => ({
        cardId: `${image.id}-${side}`,
        image,
        imageId: image.id,
      }))
    ),
}));
// A pair rests a moment, not the game's 800 ms: the rule is the hook's own test.
vi.mock("../../constants/games", async (original) => {
  const games = await original<typeof import("../../constants/games")>();
  return {
    ...games,
    GAMES: {
      ...games.GAMES,
      MEMORY: {
        ...games.GAMES.MEMORY,
        DELAY: { ...games.GAMES.MEMORY.DELAY, HOLD_MS: 20 },
      },
    },
  };
});

beforeEach(() => {
  answerBoard();
  vi.mocked(submitMemoryScore).mockReset();
  vi.mocked(submitMemoryScore).mockResolvedValue({
    ok: true,
    score: SCORE_BODY,
  });
});

const down = (position: number) =>
  page.getByRole("button", {
    name: enT("Games.cardFaceDown", { position }),
  });
const matched = (position: number, alt: string) =>
  page.getByRole("button", {
    name: enT("Games.cardMatched", { alt, position }),
  });

/** Turns up the cards in `positions`, one click each. */
const click = (...positions: number[]) =>
  inOrder(positions, (position) => down(position).click());

const PAIRS = Array.from({ length: MEMORY_RULE.PAIRS }, (_, index) => [
  index * 2 + 1,
  index * 2 + 2,
]);

/** Twelve real clicks and their waits: the default 30 s is short when the suites run side by side. */
const FULL_GAME_TIMEOUT_MS = 90 * UNIT.MS_PER_SECOND;

/** Plays every pair; the last one ends the game, whose dialog covers the board. */
const playWholeGame = async () => {
  await inOrder(PAIRS.slice(0, -1), async ([one = 0, two = 0]) => {
    await click(one, two);
    await vi.waitFor(() => matched(two, `Sea deck-${one / 2 + 0.5}`).element());
  });
  const [first = 0, second = 0] = PAIRS.at(-1) ?? [];
  await click(first, second);
  await vi.waitFor(() => page.getByRole("dialog").element());
};

/** Draws the board and turns its first card up with Enter. */
const turnFirstUp = async () => {
  await renderInApp({
    children: boardFrame(<MemoryBoard canUpload={false} />),
  });
  await vi.waitFor(() => down(1).element());
  down(1).element().focus();
  await userEvent.keyboard("{Enter}");
};

describe("MemoryBoard", () => {
  it("shows the skeleton while the deck is on its way, then the twelve cards", async () => {
    worker.use(
      http.get(DECK_URL, async () => {
        counts.deck += 1;
        await new Promise((resolve) => setTimeout(resolve, 150));
        return HttpResponse.json(deckBody());
      })
    );
    const screen = await renderInApp({
      children: <MemoryBoard canUpload={false} />,
    });
    await expect
      .element(screen.getByRole("status").first())
      .toHaveTextContent(enT("Games.loading"));
    await expect.element(down(12)).toBeVisible();
    expect(
      document.querySelectorAll("button[aria-label]").length
    ).toBeGreaterThanOrEqual(MEMORY_RULE.CARDS);
    expect(counts.deck).toBe(1);
  });

  it("dresses New game as a small Laura action: its icon, and the sea's picture at its right", async () => {
    await renderInApp({
      children: boardFrame(<MemoryBoard canUpload={false} />),
    });
    await expect.element(down(12)).toBeVisible();
    const action = page
      .getByRole("button", { name: enT("Games.newGame") })
      .element();
    expect(getComputedStyle(action).fontWeight).toBe("700");
    expect(action.getBoundingClientRect().height).toBe(32);
    expect(action.querySelector("svg")).not.toBeNull();
    expect(action.querySelector("span[aria-hidden]")).not.toBeNull();
  });

  it("turns a card up with Enter and with Space", async () => {
    await turnFirstUp();
    await expect
      .element(
        page.getByRole("button", {
          name: enT("Games.cardFaceUp", { alt: "Sea deck-1", position: 1 }),
        })
      )
      .toBeVisible();
    // Its pair, so the two stay (a miss would turn back within the hold).
    down(2).element().focus();
    await userEvent.keyboard(" ");
    await expect.element(matched(2, "Sea deck-1")).toBeVisible();
  });

  it("keeps the focus on a card that matched, and says so", async () => {
    await turnFirstUp();
    down(2).element().focus();
    await userEvent.keyboard("{Enter}");
    await expect.element(matched(2, "Sea deck-1")).toBeVisible();
    expect(document.activeElement?.getAttribute("aria-label")).toBe(
      enT("Games.cardMatched", { alt: "Sea deck-1", position: 2 })
    );
    await expect
      .element(page.getByRole("status").first())
      .toHaveTextContent(enT("Games.announceMatch", { alt: "Sea deck-1" }));
  });

  it(
    "saves a finished game, reads the leaderboard again and never the deck",
    async () => {
      await renderInApp({
        children: boardFrame(<MemoryBoard canUpload={false} />),
      });
      await expect.element(down(12)).toBeVisible();
      await expect.poll(() => counts.leaderboard).toBe(1);
      await playWholeGame();
      await expect
        .poll(() => vi.mocked(submitMemoryScore).mock.calls.length)
        .toBe(1);
      await expect.poll(() => counts.leaderboard).toBe(2);
      expect(counts.deck).toBe(1);
      await expect
        .element(page.getByText(enT("Games.rank"), { exact: true }))
        .toBeVisible();
      await expect
        .element(page.getByText(String(SCORE_BODY.rank), { exact: true }))
        .toBeVisible();
    },
    FULL_GAME_TIMEOUT_MS
  );

  it("does not draw a new deck on a window focus or a page hidden and shown, and does on New game", async () => {
    const Harness = () => {
      const [hidden, setHidden] = useState(false);
      const toggle = useCallback(() => setHidden((now) => !now), []);
      return (
        <>
          <button onClick={toggle} type="button">
            toggle
          </button>
          <Activity mode={hidden ? "hidden" : "visible"}>
            <AOFFreshOnReturn>
              {boardFrame(<MemoryBoard canUpload={false} />)}
            </AOFFreshOnReturn>
          </Activity>
        </>
      );
    };
    await renderInApp({ children: <Harness /> });
    await expect.element(down(1)).toBeVisible();
    window.dispatchEvent(new Event("focus"));
    document.dispatchEvent(new Event("visibilitychange"));
    expect(counts.deck).toBe(1);
    await click(1);
    await page.getByRole("button", { name: "toggle" }).click();
    await page.getByRole("button", { name: "toggle" }).click();
    // The board starts over on return: idle, a new deck.
    await expect.element(down(1)).toBeVisible();
    await expect.poll(() => counts.deck).toBe(2);
    await click(1);
    await page.getByRole("button", { name: enT("Games.newGame") }).click();
    await expect.poll(() => counts.deck).toBe(3);
  });
});

describe("MemoryBoard when the deck cannot be played", () => {
  it("tells there are too few photos instead of dealing a board", async () => {
    worker.use(http.get(DECK_URL, () => HttpResponse.json(deckBody(3))));
    await renderInApp({
      children: boardFrame(<MemoryBoard canUpload={false} />),
    });
    await expect
      .element(page.getByText(enT("Games.needMoreTitle")))
      .toBeVisible();
    expect(document.querySelectorAll("button[aria-label]").length).toBe(0);
  });

  it("points an Admin to Upload when photos are missing", async () => {
    worker.use(http.get(DECK_URL, () => HttpResponse.json(deckBody(2))));
    await renderInApp({ children: boardFrame(<MemoryBoard canUpload />) });
    await expect
      .element(page.getByRole("link", { name: enT("Games.uploadMore") }))
      .toBeVisible();
  });

  it("tells a failed deck, with a retry that asks again", async () => {
    let first = true;
    worker.use(
      http.get(DECK_URL, () => {
        counts.deck += 1;
        if (first) {
          first = false;
          return HttpResponse.json({}, { status: HTTP.STATUS.BAD_REQUEST });
        }
        return HttpResponse.json(deckBody());
      })
    );
    await renderInApp({
      children: boardFrame(<MemoryBoard canUpload={false} />),
    });
    await expect.element(page.getByText(enT("Games.deckFailed"))).toBeVisible();
    await page.getByRole("button", { name: enT("Games.retry") }).click();
    await expect.element(down(1)).toBeVisible();
  });

  it("tells a visitor Laura is closed to, with no toast", async () => {
    worker.use(
      http.get(DECK_URL, () =>
        HttpResponse.json(
          { code: ERROR.CODE.FORBIDDEN },
          { status: HTTP.STATUS.FORBIDDEN }
        )
      )
    );
    await renderInApp({
      children: boardFrame(<MemoryBoard canUpload={false} />),
    });
    await expect.element(page.getByText(enT("Games.forbidden"))).toBeVisible();
    expect(document.querySelector("[data-sonner-toast]")).toBeNull();
  });
});

describe("a score the API refuses", () => {
  it("tells the dialog it was not recorded, with no retry", async () => {
    vi.mocked(submitMemoryScore).mockResolvedValue({
      ok: false,
      reason: GAMES.SUBMIT_ERROR.IMPLAUSIBLE,
    });
    await renderInApp({
      children: boardFrame(<MemoryBoard canUpload={false} />),
    });
    await expect.element(down(12)).toBeVisible();
    await playWholeGame();
    await expect
      .element(page.getByText(enT("Games.notRecorded")))
      .toBeVisible();
  });
});
