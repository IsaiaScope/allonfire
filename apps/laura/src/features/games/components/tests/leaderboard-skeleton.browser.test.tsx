// @module-tag integration

import { LAURA as API_LAURA } from "@allonfire/api/features/laura/constants/laura";
import { FORM_WIDTHS } from "@allonfire/ui/shared/tests/height-at";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { page } from "vitest/browser";
import { QUERY } from "@/shared/constants/query";
import { inOrder } from "@/shared/tests/in-order";
import { renderInApp } from "@/shared/tests/render-in-app";
import { enT } from "@/shared/tests/translators";
import {
  emptyLeaderboardBody,
  leaderboardBody,
  leaderboardEntry,
} from "../../tests/leaderboard-body";
import { LeaderboardSkeleton } from "../leaderboard-skeleton";
import { LeaderboardView } from "../leaderboard-view";

vi.mock(
  "@allonfire/ui/shared/components/aof-image",
  () => import("@allonfire/ui/shared/tests/aof-image-mock")
);

const WIDTHS = FORM_WIDTHS.filter(([, width]) => width !== 520);
/** The most the API lists. */
const FULL = API_LAURA.GAMES.LIMIT.LEADERBOARD_TOP;
const VIEW_HEIGHT = 900;
/** Tailwind's `md`, where cards give way to the table. */
const MD = 768;

const full = () =>
  leaderboardBody({
    entries: Array.from({ length: FULL }, (_, index) =>
      leaderboardEntry({ name: `Player ${index + 1}`, rank: index + 1 })
    ),
  });

const real = (width: number, body: ReturnType<typeof leaderboardBody>) => {
  const client = new QueryClient();
  client.setQueryData(QUERY.GAMES.LEADERBOARD, body);
  return (
    <div className="@container flex flex-col" style={{ width }}>
      <HydrationBoundary state={dehydrate(client)}>
        <LeaderboardView />
      </HydrationBoundary>
    </div>
  );
};

const skeleton = (width: number) => (
  <div className="@container flex flex-col" style={{ width }}>
    <LeaderboardSkeleton />
  </div>
);

const heightOf = async (view: React.ReactNode, ready: () => Element | null) => {
  const screen = await renderInApp({ children: view });
  await vi.waitFor(() => {
    if (!ready()) {
      throw new Error("not drawn yet");
    }
  });
  await document.fonts.ready;
  const height =
    screen.container.firstElementChild?.getBoundingClientRect().height;
  await screen.unmount();
  return height ?? 0;
};

const WINDOW = { height: innerHeight, width: innerWidth };

afterEach(() => page.viewport(WINDOW.width, WINDOW.height));

describe("LeaderboardSkeleton", () => {
  it.each(WIDTHS)(
    "is as tall as the loaded leaderboard on %s (3 players, and a full top ten where it is a table)",
    async (_name, width) => {
      // `md` is the window's: the table from it, cards below.
      await page.viewport(width, VIEW_HEIGHT);
      const waiting = await heightOf(skeleton(width), () =>
        document.querySelector("[data-skeleton=leaderboard]")
      );
      // The table's box is as tall for any number of players; a phone's cards
      // add up, so the skeleton's three stand for the three players it holds.
      const bodies =
        width < MD ? [leaderboardBody()] : [leaderboardBody(), full()];
      await inOrder(bodies, async (body) => {
        const loaded = await heightOf(real(width, body), () =>
          document.querySelector("[data-slot=table-container], ul")
        );
        expect(waiting).toBeCloseTo(loaded, 0);
      });
    }
  );

  it.each(WIDTHS)(
    "has the table's place where the leaderboard nobody has played yet has it on %s: the podium stands empty",
    async (_name, width) => {
      await page.viewport(width, VIEW_HEIGHT);
      /** How far down the table's place starts, whatever stands in it. */
      const tableTop = async (
        view: React.ReactNode,
        tableOf: () => Element | null | undefined
      ) => {
        const screen = await renderInApp({ children: view });
        await vi.waitFor(() => {
          if (!tableOf()) {
            throw new Error("not drawn yet");
          }
        });
        await document.fonts.ready;
        const root = screen.container.firstElementChild;
        const top =
          (tableOf()?.getBoundingClientRect().top ?? 0) -
          (root?.getBoundingClientRect().top ?? 0);
        await screen.unmount();
        return top;
      };
      const waiting = await tableTop(
        skeleton(width),
        () =>
          document.querySelector("[data-skeleton=leaderboard]")
            ?.lastElementChild?.lastElementChild
      );
      const loaded = await tableTop(
        real(width, emptyLeaderboardBody()),
        () =>
          document.querySelector("[data-slot=leaderboard-podium]")
            ?.parentElement?.lastElementChild
      );
      // The empty notice has a height of its own: what must not move is everything above it.
      expect(waiting).toBeCloseTo(loaded, 0);
    }
  );

  it("says it is loading, in one status, without its parts being read", async () => {
    await renderInApp({ children: skeleton(900) });
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent(enT("Games.loading"));
    expect(
      document.querySelector("[data-skeleton=leaderboard]")
    ).toHaveAttribute("aria-busy", "true");
  });
});
