// @module-tag integration

import {
  formatClock,
  formatTime,
} from "@allonfire/core/shared/utils/format-time";
import {
  type DehydratedState,
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { useState } from "react";
import { page, userEvent } from "vitest/browser";
import { QUERY } from "@/shared/constants/query";
import { renderInApp } from "@/shared/tests/render-in-app";
import { enT } from "@/shared/tests/translators";
import IT from "../../../i18n/translations/it.json" with { type: "json" };
import { answerBoard, boardFrame, counts } from "../../tests/board-mocks";
import {
  leaderboardBody,
  leaderboardEntry,
} from "../../tests/leaderboard-body";
import { MemoryBoard } from "../memory-board";

vi.mock("@allonfire/ui/shared/components/aof-image", async () =>
  (await import("../../tests/board-mocks")).imageServerMock()
);
vi.mock("../../actions/submit-memory-score", () => ({
  submitMemoryScore: vi.fn(),
}));

/** What the page's own read hands the boundary. */
const hydration = (body: ReturnType<typeof leaderboardBody>) => {
  const client = new QueryClient();
  client.setQueryData(QUERY.GAMES.LEADERBOARD, body);
  return dehydrate(client);
};

// Lets a test hand the mounted page a newer read, as a navigation back does.
const swap: { to: (state: DehydratedState) => void } = { to: () => undefined };

const Page = ({ first }: { first: DehydratedState }) => {
  const [state, setState] = useState(first);
  swap.to = setState;
  return (
    <HydrationBoundary state={state}>
      <MemoryBoard canUpload={false} />
    </HydrationBoundary>
  );
};

const best = (timeMs: number, moves = 8) =>
  leaderboardBody({
    entries: [leaderboardEntry({ moves, name: "Ada", rank: 1, timeMs })],
  });

/** The slowest time and the most moves a header has to hold. */
const LONGEST_MS = 3_599_990;
const LONGEST_MOVES = 999;
/** The widths the header is read at, each in both languages. */
const WIDTHS = [
  ["a small phone", 320],
  ["a phone", 360],
  ["a tablet", 768],
  ["a window with the sidebar open", 900],
  ["a wide window", 1400],
] as const;
const LANGUAGES = [
  ["English", "en"],
  ["Italian", "it"],
] as const;
const HEADER_ROOMS = WIDTHS.flatMap(([name, width]) =>
  LANGUAGES.map(([label, language]) => [name, width, label, language] as const)
);

beforeEach(answerBoard);

const down = (position: number) =>
  page.getByRole("button", {
    name: enT("Games.cardFaceDown", { position }),
  });

/** Each figure of the header and the best game, as it is found and what its tip says. */
const FIGURES = [
  [
    "the best game's time",
    () => page.getByText(formatTime(61_000), { exact: true }),
    "Games.time",
  ],
  [
    "the best game's moves",
    () => page.getByText("8", { exact: true }),
    "Games.moves",
  ],
  [
    "the board's clock",
    () => page.getByText(formatClock(0), { exact: true }),
    "Games.time",
  ],
] as const;

describe("Memory page", () => {
  it("shows the best game from the page's own read, with no request for it", async () => {
    await renderInApp({
      children: (
        <div
          className="@container flex flex-col"
          style={{ height: 700, width: 1200 }}
        >
          <Page first={hydration(best(61_000))} />
        </div>
      ),
    });
    await expect.element(down(1)).toBeVisible();
    await expect
      .element(page.getByText(formatTime(61_000), { exact: true }))
      .toBeVisible();
    // The best game's moves sit beside its time, on their own chip.
    await expect
      .element(
        page.getByText(String(best(61_000).entries[0]?.moves), { exact: true })
      )
      .toBeVisible();
    expect(counts.leaderboard).toBe(0);
  });

  it.each(FIGURES)(
    "names %s on hover, the pointer over it",
    async (_name, find, key) => {
      await renderInApp({
        children: boardFrame(<Page first={hydration(best(61_000))} />),
      });
      await expect.element(down(1)).toBeVisible();
      const tip = () =>
        document.querySelector("[data-slot=tooltip-content]")?.textContent;
      const figure = find();
      expect(
        getComputedStyle(figure.element().closest("dd") ?? document.body).cursor
      ).toBe("pointer");
      await userEvent.hover(figure);
      await vi.waitFor(() => expect(tip()).toBe(enT(key)));
      await userEvent.unhover(figure);
      await vi.waitFor(() => expect(tip()).toBeUndefined());
    }
  );

  it("shows no badge while nobody has played", async () => {
    await renderInApp({
      children: <Page first={hydration(leaderboardBody({ entries: [] }))} />,
    });
    await expect.element(down(1)).toBeVisible();
    expect(document.querySelector("svg.tabler-icon-trophy")).toBeNull();
    expect(document.body.textContent).not.toContain(enT("Games.bestTime"));
  });

  it.each(HEADER_ROOMS)(
    "keeps the header inside the cards' width on %s in %s, its longest figures too, scrolling what does not fit",
    async (_name, width, _language, language) => {
      const screen = await renderInApp({
        children: (
          <div
            className="@container flex flex-col"
            style={{ height: 700, width }}
          >
            <Page first={hydration(best(LONGEST_MS, LONGEST_MOVES))} />
          </div>
        ),
        language,
        ...(language === "it" ? { messages: IT } : {}),
      });
      await expect
        .element(page.getByText(formatTime(LONGEST_MS), { exact: true }))
        .toBeVisible();
      const header = screen.container
        .querySelector("[data-slot=memory-header]")
        ?.getBoundingClientRect();
      const row = screen.container.querySelector(
        "[data-slot=memory-header] > div"
      );
      // The row never spills out of the cards' width: what does not fit scrolls.
      const box = row?.getBoundingClientRect();
      expect(box?.left).toBeGreaterThanOrEqual((header?.left ?? 0) - 1);
      expect(box?.right).toBeLessThanOrEqual((header?.right ?? 0) + 1);
      expect(row ? getComputedStyle(row).overflowX : "").toBe("auto");
    }
  );

  it("takes a newer read without disturbing the game", async () => {
    await renderInApp({
      children: boardFrame(<Page first={hydration(best(61_000))} />),
    });
    await down(1).click();
    await expect
      .element(page.getByText(formatTime(61_000), { exact: true }))
      .toBeVisible();
    const before = document.body.textContent;
    swap.to(hydration(best(45_000)));
    await expect
      .element(page.getByText(formatTime(45_000), { exact: true }))
      .toBeVisible();
    // The card stays face up: it is no longer offered as face down.
    await expect.element(down(1)).not.toBeInTheDocument();
    expect(before).toContain(enT("Games.moves"));
  });
});
