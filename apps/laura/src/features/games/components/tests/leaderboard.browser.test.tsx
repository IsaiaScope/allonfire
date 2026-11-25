// @module-tag integration

import { worker } from "@allonfire/config/tests/browser/msw";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { invalidateStatic } from "@allonfire/core/features/next/query/utils/invalidate-static";
import { formatTime } from "@allonfire/core/shared/utils/format-time";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { HttpResponse, http } from "msw";
import { page } from "vitest/browser";
import { QUERY } from "@/shared/constants/query";
import { LEADERBOARD_URL } from "@/shared/tests/msw/handlers";
import { renderInApp } from "@/shared/tests/render-in-app";
import { enT } from "@/shared/tests/translators";
import { GAMES } from "../../constants/games";
import {
  leaderboardBody,
  leaderboardEntry,
} from "../../tests/leaderboard-body";
import { LeaderboardView } from "../leaderboard-view";

// A stored Avatar is drawn through next/image: here, a mark.
vi.mock(
  "@allonfire/ui/shared/components/aof-image",
  () => import("@allonfire/ui/shared/tests/aof-image-mock")
);

const counts = { leaderboard: 0 };

/** From `md` the players are a table; below it, cards. */
const TABLE_WIDTH = 1024;
const VIEW_HEIGHT = 900;
const PHONE_WIDTH = 390;
/** A tablet at `md`, and what its page leaves beside the folded sidebar. */
const TABLET_WIDTH = 768;
const TABLET_CONTENT = 616;

const WINDOW = { height: innerHeight, width: innerWidth };

beforeEach(async () => {
  counts.leaderboard = 0;
  await page.viewport(TABLE_WIDTH, VIEW_HEIGHT);
});

afterEach(() => page.viewport(WINDOW.width, WINDOW.height));

const answer = (body: ReturnType<typeof leaderboardBody>) =>
  worker.use(
    http.get(LEADERBOARD_URL, () => {
      counts.leaderboard += 1;
      return HttpResponse.json(body);
    })
  );

/** The view with its body hydrated, as the page hands it. */
const hydrated = (body: ReturnType<typeof leaderboardBody>) => {
  const client = new QueryClient();
  client.setQueryData(QUERY.GAMES.LEADERBOARD, body);
  return (
    <HydrationBoundary state={dehydrate(client)}>
      <LeaderboardView />
    </HydrationBoundary>
  );
};

describe("LeaderboardView", () => {
  it("lists the players in order with their rank, moves and time, and asks nothing when it was hydrated", async () => {
    const body = leaderboardBody();
    answer(body);
    await renderInApp({ children: hydrated(body) });
    const rows = page.getByRole("row");
    await expect.element(rows.nth(1)).toBeVisible();
    await Promise.all(
      body.entries.map(async (entry, index) => {
        await expect
          .element(rows.nth(index + 1))
          .toHaveTextContent(formatTime(entry.timeMs));
        await expect
          .element(rows.nth(index + 1))
          .toHaveTextContent(String(entry.rank));
      })
    );
    expect(counts.leaderboard).toBe(0);
  });

  it("marks the caller's row and names someone with no name as someone", async () => {
    const body = leaderboardBody();
    await renderInApp({ children: hydrated(body) });
    await expect
      .element(page.getByText(enT("Games.anonymous")).first())
      .toBeVisible();
    // The cards wait hidden behind the table, so only what is drawn counts.
    const marked = [...document.querySelectorAll("[aria-current=true]")].filter(
      (element) => element.checkVisibility()
    );
    expect(marked).toHaveLength(1);
    expect(marked[0]?.textContent).toContain("Grace");
  });

  it("tells a failed first read, with a retry that asks again", async () => {
    let first = true;
    worker.use(
      http.get(LEADERBOARD_URL, () => {
        counts.leaderboard += 1;
        if (first) {
          first = false;
          return HttpResponse.json({}, { status: HTTP.STATUS.BAD_REQUEST });
        }
        return HttpResponse.json(leaderboardBody());
      })
    );
    await renderInApp({ children: <LeaderboardView /> });
    await expect
      .element(page.getByText(enT("Games.leaderboardFailed")))
      .toBeVisible();
    await page.getByRole("button", { name: enT("Games.retry") }).click();
    await expect
      .element(page.getByRole("table").getByText("Ada", { exact: true }))
      .toBeVisible();
    expect(counts.leaderboard).toBe(2);
  });

  it("tells a visitor Laura is closed to, with no toast", async () => {
    worker.use(
      http.get(LEADERBOARD_URL, () =>
        HttpResponse.json({}, { status: HTTP.STATUS.FORBIDDEN })
      )
    );
    await renderInApp({ children: <LeaderboardView /> });
    await expect.element(page.getByText(enT("Games.forbidden"))).toBeVisible();
    expect(document.querySelector("[data-sonner-toast]")).toBeNull();
  });

  it("reads the board again when a score refreshed it, and shows the new row", async () => {
    const before = leaderboardBody();
    const after = leaderboardBody({
      entries: [leaderboardEntry({ moves: 6, name: "Newest", rank: 1 })],
    });
    answer(after);
    const client = new QueryClient();
    client.setQueryData(QUERY.GAMES.LEADERBOARD, before);
    await renderInApp({
      children: (
        <QueryClientProvider client={client}>
          <LeaderboardView />
        </QueryClientProvider>
      ),
    });
    await expect
      .element(page.getByRole("table").getByText("Ada", { exact: true }))
      .toBeVisible();
    await invalidateStatic(client, QUERY.GAMES.LEADERBOARD);
    await expect
      .element(page.getByRole("table").getByText("Newest"))
      .toBeVisible();
  });

  it("keeps the page itself from growing sideways on a phone", async () => {
    const body = leaderboardBody();
    const screen = await renderInApp({
      children: <div style={{ width: 360 }}>{hydrated(body)}</div>,
    });
    await expect.element(page.getByRole("table")).toBeVisible();
    const frame = screen.container.firstElementChild;
    expect(frame).not.toBeNull();
    expect((frame?.scrollWidth ?? 0) <= (frame?.clientWidth ?? 0)).toBe(true);
  });
});

const PODIUM = "[data-slot=leaderboard-podium]";
/** The colour pictures (medals) inside `root`, drawn from inlined SVG. */
const medalsIn = (root: Element | null) =>
  root?.querySelectorAll('[data-testid="picture"][data-src^="data:image/svg"]')
    .length ?? 0;
const crowd = (count: number) =>
  leaderboardBody({
    entries: Array.from({ length: count }, (_, index) =>
      leaderboardEntry({
        moves: 8 + index,
        name: `Player ${index + 1}`,
        rank: index + 1,
      })
    ),
  });

describe("LeaderboardView, an empty board", () => {
  it("shows a dash where nobody has a time, and still the stats of an empty board", async () => {
    const body = leaderboardBody({
      entries: [],
      me: {
        averageMs: null,
        bestMoves: null,
        bestTimeMs: null,
        rank: null,
        totalGames: 0,
      },
      stats: {
        averageMs: null,
        fastestMs: null,
        fewestMoves: null,
        totalGames: 0,
        uniquePlayers: 0,
      },
    });
    await renderInApp({ children: hydrated(body) });
    await expect
      .element(page.getByText(enT("Games.noScoresTitle")))
      .toBeVisible();
    await expect
      .element(page.getByRole("heading", { name: enT("Games.yourStats") }))
      .toBeVisible();
    expect(document.body.textContent).toContain("—");
  });
});

describe("LeaderboardView, who played", () => {
  it("puts each player's email under their name, also when they have no name", async () => {
    const body = leaderboardBody();
    await renderInApp({ children: hydrated(body) });
    await expect
      .element(page.getByText(enT("Games.anonymous")).first())
      .toBeVisible();
    const row = (text: string) =>
      page.getByRole("row").filter({ hasText: text });
    await Promise.all(
      body.entries.map((entry) =>
        expect
          .element(row(entry.name ?? enT("Games.anonymous")))
          .toHaveTextContent(entry.email)
      )
    );
  });
});

describe("LeaderboardView on a phone", () => {
  it("draws a card each instead of the table on a phone", async () => {
    await page.viewport(PHONE_WIDTH, VIEW_HEIGHT);
    const body = leaderboardBody();
    await renderInApp({ children: hydrated(body) });
    await expect
      .element(page.getByText(enT("Games.anonymous")).first())
      .toBeVisible();
    const cards = [
      ...document.querySelectorAll("[data-slot=leaderboard-card]"),
    ];
    expect(cards).toHaveLength(body.entries.length);
    for (const [index, entry] of body.entries.entries()) {
      expect(cards[index]?.textContent).toContain(formatTime(entry.timeMs));
      expect(cards[index]?.textContent).toContain(String(entry.moves));
    }
    expect(cards.map((card) => card.checkVisibility())).toEqual([
      true,
      true,
      true,
    ]);
    expect(document.querySelector("table")?.checkVisibility()).toBe(false);
  });
});

describe("LeaderboardView, the top ten", () => {
  it("is headed by the top ten", async () => {
    await renderInApp({ children: hydrated(leaderboardBody()) });
    await expect
      .element(page.getByRole("heading", { name: "Top 10" }))
      .toBeVisible();
  });

  it("stands the first three on a podium, second left, first in the middle, third right", async () => {
    await renderInApp({ children: hydrated(leaderboardBody()) });
    const podium = document.querySelector(PODIUM);
    expect(podium).not.toBeNull();
    const places = [...(podium?.querySelectorAll("li") ?? [])];
    expect(places.map((place) => place.textContent)).toEqual([
      expect.stringContaining("Grace"),
      expect.stringContaining("Ada"),
      expect.stringContaining(enT("Games.anonymous")),
    ]);
    expect(
      places.map(
        (place) => place.querySelector(":scope > div[aria-hidden]")?.textContent
      )
    ).toEqual(["2", "1", "3"]);
    // Each step wears its picture: a trophy each, gold, silver, bronze.
    expect(places.map((place) => medalsIn(place))).toEqual([1, 1, 1]);
  });

  it("is a picture of the table: hidden from a screen reader, the caller ringed", async () => {
    await renderInApp({ children: hydrated(leaderboardBody()) });
    expect(document.querySelector(PODIUM)).toHaveAttribute(
      "aria-hidden",
      "true"
    );
    expect(document.querySelectorAll(`${PODIUM} .ring-primary`)).toHaveLength(
      1
    );
  });

  it("leaves a place as an empty outlined step when fewer than three played, and all three when nobody did", async () => {
    const one = await renderInApp({ children: hydrated(crowd(1)) });
    const places = () => [...document.querySelectorAll(`${PODIUM} li`)];
    expect(places()).toHaveLength(3);
    expect(places().map((place) => medalsIn(place))).toEqual([0, 1, 0]);
    expect(places().map((place) => place.textContent)).toEqual([
      "2",
      expect.stringContaining("Player 1"),
      "3",
    ]);
    await one.unmount();
    await renderInApp({ children: hydrated(crowd(0)) });
    expect(places().map((place) => place.textContent)).toEqual(["2", "1", "3"]);
    expect(places().map((place) => medalsIn(place))).toEqual([0, 0, 0]);
  });
});

describe("LeaderboardView, the table's room", () => {
  it("fits its columns in the room a tablet leaves beside the folded sidebar, with no sideways scroll", async () => {
    await page.viewport(TABLET_WIDTH, VIEW_HEIGHT);
    await renderInApp({
      children: (
        <div style={{ width: TABLET_CONTENT }}>{hydrated(crowd(10))}</div>
      ),
    });
    await expect.element(page.getByRole("row").nth(10)).toBeVisible();
    const viewport = document.querySelector<HTMLElement>(
      "[data-slot=data-table-viewport]"
    );
    expect(viewport?.scrollWidth).toBeLessThanOrEqual(
      viewport?.clientWidth ?? 0
    );
  });
});

describe("LeaderboardView, the table's places", () => {
  it("gives the podium's places a medal in the table and every other place its number", async () => {
    await renderInApp({ children: hydrated(crowd(5)) });
    const rows = page.getByRole("row");
    await expect.element(rows.nth(5)).toBeVisible();
    const row = (position: number) => rows.nth(position).element();
    expect([1, 2, 3].map((place) => medalsIn(row(place)))).toEqual([1, 1, 1]);
    expect([4, 5].map((place) => medalsIn(row(place)))).toEqual([0, 0]);
    expect(row(4).textContent).toContain("4");
  });

  it("tells the caller's figures and everyone's on tiles, each with its label, side by side row for row", async () => {
    const body = leaderboardBody();
    await renderInApp({ children: hydrated(body) });
    await expect
      .element(page.getByRole("heading", { name: enT("Games.yourStats") }))
      .toBeVisible();
    const tile = (group: string, label: string) =>
      [
        ...document.querySelectorAll(`section[aria-label="${group}"] dl > div`),
      ].find((box) => box.querySelector("dt")?.textContent === label);
    const value = (box: Element | undefined) =>
      box?.querySelector("dd")?.textContent;
    const mine = enT("Games.yourStats");
    const all = enT("Games.globalStats");
    // One label for a figure in both groups (the headings say whose): time next
    // to time, moves to moves, the mean to the mean, the games to the games.
    const pairs = [
      [
        tile(mine, enT("Games.bestTime")),
        tile(all, enT("Games.bestTime")),
        formatTime(body.me.bestTimeMs ?? 0),
        formatTime(body.stats.fastestMs ?? 0),
      ],
      [
        tile(mine, enT("Games.fewestMoves")),
        tile(all, enT("Games.fewestMoves")),
        String(body.me.bestMoves),
        String(body.stats.fewestMoves),
      ],
      [
        tile(mine, enT("Games.averageTime")),
        tile(all, enT("Games.averageTime")),
        formatTime(body.me.averageMs ?? 0),
        formatTime(body.stats.averageMs ?? 0),
      ],
      [
        tile(mine, enT("Games.gamesPlayed")),
        tile(all, enT("Games.gamesPlayed")),
        String(body.me.totalGames),
        String(body.stats.totalGames),
      ],
    ] as const;
    for (const [one, other, oneValue, otherValue] of pairs) {
      expect(value(one)).toBe(oneValue);
      expect(value(other)).toBe(otherValue);
      expect(one?.getBoundingClientRect().top).toBeCloseTo(
        other?.getBoundingClientRect().top ?? -1,
        0
      );
    }
    expect(value(tile(mine, enT("Games.rank")))).toBe(String(body.me.rank));
    expect(value(tile(all, enT("Games.uniquePlayers")))).toBe(
      String(body.stats.uniquePlayers)
    );
  });
});

describe("LeaderboardView, the stats", () => {
  it("holds as many tiles in each column as the skeleton draws", async () => {
    await renderInApp({ children: hydrated(leaderboardBody()) });
    const columns = document.querySelectorAll("section[aria-label] > dl");
    expect([...columns].map((column) => column.children.length)).toEqual([
      GAMES.LEADERBOARD.STATS_PER_GROUP,
      GAMES.LEADERBOARD.STATS_PER_GROUP,
    ]);
  });
});
