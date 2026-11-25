// @module-tag integration

import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { page } from "vitest/browser";
import { QUERY } from "@/shared/constants/query";
import { renderInApp } from "@/shared/tests/render-in-app";
import IT from "../../../i18n/translations/it.json" with { type: "json" };
import {
  leaderboardBody,
  leaderboardEntry,
} from "../../tests/leaderboard-body";
import { GameCompleteDialog } from "../game-complete-dialog";
import { LeaderboardView } from "../leaderboard-view";

vi.mock("@allonfire/ui/shared/components/aof-image", async () => ({
  AOFImage: (await import("@allonfire/ui/shared/tests/image-mock")).ImageMock,
}));

const WINDOW = { height: innerHeight, width: innerWidth };
const VIEW_HEIGHT = 900;
afterEach(() => page.viewport(WINDOW.width, WINDOW.height));

/** The widths the pages are read at: a small phone, a phone, a tablet, a desktop. */
const WIDTHS = [320, 390, 768, 1280] as const;
const LANGUAGES = [
  ["English", "en"],
  ["Italian", "it"],
] as const;

const ONE_WORD = "Bartholomew".repeat(8);
const MANY_WORDS = "Maria Giuseppina Anna Concetta di Montefiore della Rovere";
const SLOWEST_MS = 3_599_990;
const MOST_MOVES = 999;
const A_MILLION = 1_000_000;

/** A top three whose names, times and counts are as long as they come. */
const longBoard = () =>
  leaderboardBody({
    entries: [
      leaderboardEntry({
        isMe: true,
        moves: MOST_MOVES,
        name: ONE_WORD,
        rank: 1,
        timeMs: SLOWEST_MS,
      }),
      leaderboardEntry({
        moves: MOST_MOVES,
        name: MANY_WORDS,
        rank: 2,
        timeMs: SLOWEST_MS,
      }),
      leaderboardEntry({ moves: 8, name: null, rank: 3, timeMs: 40_000 }),
    ],
    me: {
      averageMs: SLOWEST_MS,
      bestMoves: MOST_MOVES,
      bestTimeMs: SLOWEST_MS,
      rank: A_MILLION,
      totalGames: A_MILLION,
    },
    stats: {
      averageMs: SLOWEST_MS,
      fastestMs: SLOWEST_MS,
      fewestMoves: MOST_MOVES,
      totalGames: A_MILLION,
      uniquePlayers: A_MILLION,
    },
  });

/**
 * What of `box` shows outside it sideways: any element drawn inside it, bar
 * the screen-reader text and the decorative layers (they cannot be clicked),
 * that is wider than the box lets it be. A long word has to be cut by its own
 * ellipsis, never push its box wider.
 */
const spills = (box: Element) => {
  const outer = box.getBoundingClientRect();
  return [...box.querySelectorAll("*")]
    .filter(
      (element) =>
        !(
          element.closest(".sr-only, .pointer-events-none") ||
          element instanceof SVGElement
        )
    )
    .filter((element) => {
      const { left, right, width } = element.getBoundingClientRect();
      return width > 0 && (left < outer.left - 1 || right > outer.right + 1);
    })
    .map((element) => element.outerHTML.slice(0, 80));
};

/** The words of `language`: English is the render's own. */
const wordsOf = (language: "en" | "it") =>
  language === "it" ? { messages: IT } : {};

/** The leaderboard of `longBoard`, drawn in `language`. */
const renderLongBoard = (language: "en" | "it") => {
  const client = new QueryClient();
  client.setQueryData(QUERY.GAMES.LEADERBOARD, longBoard());
  return renderInApp({
    children: (
      <HydrationBoundary state={dehydrate(client)}>
        <LeaderboardView />
      </HydrationBoundary>
    ),
    language,
    ...wordsOf(language),
  });
};

const boxes = (selector: string) => [...document.querySelectorAll(selector)];

describe.each(LANGUAGES)("the leaderboard in %s", (_name, language) => {
  it.each(WIDTHS)(
    "keeps its longest names, times and counts inside their boxes at %ipx",
    async (width) => {
      await page.viewport(width, VIEW_HEIGHT);
      await renderLongBoard(language);
      await expect
        .element(page.getByText(MANY_WORDS).first())
        .toBeInTheDocument();
      await document.fonts.ready;
      // The page never grows sideways.
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
        document.documentElement.clientWidth
      );
      const tiles = boxes("section > dl > div");
      expect(tiles).toHaveLength(10);
      const podium = boxes("[data-slot=leaderboard-podium] > li");
      const cards = boxes("[data-slot=leaderboard-card]").filter((card) =>
        card.checkVisibility()
      );
      for (const box of [...tiles, ...podium, ...cards]) {
        expect(spills(box)).toEqual([]);
      }
    }
  );
});

describe.each(LANGUAGES)("the leaderboard's table in %s", (_name, language) => {
  it.each([768, 1280])(
    "cuts a long name to an ellipsis and keeps the moves, time and day in view at %ipx",
    async (width) => {
      await page.viewport(width, VIEW_HEIGHT);
      await renderLongBoard(language);
      await expect
        .element(page.getByRole("table").getByText(MANY_WORDS))
        .toBeInTheDocument();
      await document.fonts.ready;
      const container = document.querySelector("[data-slot=table-container]");
      expect(container).not.toBeNull();
      // Nothing scrolls sideways, and every cell ends inside the box.
      expect(container?.scrollWidth).toBeLessThanOrEqual(
        (container?.clientWidth ?? 0) + 1
      );
      const edge = container?.getBoundingClientRect().right ?? 0;
      for (const cell of container?.querySelectorAll("td") ?? []) {
        expect(cell.getBoundingClientRect().right).toBeLessThanOrEqual(
          edge + 1
        );
      }
    }
  );
});

describe.each(LANGUAGES)("the end of a game in %s", (_name, language) => {
  it.each([320, 390])(
    "keeps its badges and buttons inside the dialog at %ipx, a label on two lines at most",
    async (width) => {
      await page.viewport(width, VIEW_HEIGHT);
      await renderInApp({
        children: (
          <GameCompleteDialog
            moves={MOST_MOVES}
            onOpenChange={vi.fn()}
            onPlayAgain={vi.fn()}
            onRetry={vi.fn()}
            open
            submit={{
              score: {
                id: "s",
                isGlobalBest: true,
                isPersonalBest: true,
                rank: A_MILLION,
              },
              state: "saved",
            }}
            timeMs={SLOWEST_MS}
          />
        ),
        language,
        ...wordsOf(language),
      });
      const dialog = page.getByRole("dialog");
      await expect.element(dialog).toBeVisible();
      await document.fonts.ready;
      const popup = dialog.element();
      expect(spills(popup)).toEqual([]);
      for (const label of popup.querySelectorAll(
        "[data-slot=memory-result] span"
      )) {
        const { lineHeight } = getComputedStyle(label);
        expect(label.getBoundingClientRect().height).toBeLessThanOrEqual(
          Number.parseFloat(lineHeight) * 2 + 1
        );
      }
    }
  );
});
