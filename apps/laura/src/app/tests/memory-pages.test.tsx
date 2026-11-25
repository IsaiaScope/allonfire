// @module-tag unit
// @vitest-environment node
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import EN from "@/features/i18n/translations/en.json" with { type: "json" };
import LeaderboardPage from "../[locale]/(signed-in)/memory/leaderboard/page";
import MemoryPage from "../[locale]/(signed-in)/memory/page";

const view = vi.hoisted(() => vi.fn());
const leaderboardView = vi.hoisted(() => vi.fn());
// The Session check wraps every page in the real build; here, the page itself.
vi.mock("@/features/navigation/utils/signed-in-page", () => ({
  signedInPage: <Page,>(page: Page) => page,
}));
vi.mock("@/features/games/components/memory-view", () => ({
  MemoryView: view,
}));
vi.mock("@/features/games/components/leaderboard-page-body", () => ({
  LeaderboardPageBody: leaderboardView,
}));
vi.mock("@/features/games/utils/leaderboard-hydration", () => ({
  leaderboardHydration: vi.fn(),
}));
vi.mock("@/features/games/components/memory-board-skeleton", () => ({
  MemoryBoardSkeleton: () => <i data-skeleton="memory" />,
}));
vi.mock("@/features/games/components/leaderboard-skeleton", () => ({
  LeaderboardSkeleton: () => <i data-skeleton="leaderboard" />,
}));

const draw = (page: React.ReactNode) =>
  renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={EN} timeZone="UTC">
      {page}
    </NextIntlClientProvider>
  );

describe.each([
  {
    body: view,
    name: "Memory",
    Page: MemoryPage,
    skeleton: "memory",
    title: EN.Navigation.memory,
  },
  {
    body: leaderboardView,
    name: "the leaderboard",
    Page: LeaderboardPage,
    skeleton: "leaderboard",
    title: EN.Navigation.leaderboard,
  },
] as const)("the $name page", ({ Page, body, skeleton, title }) => {
  it("keeps its name for screen readers and reads its own data", () => {
    body.mockImplementation(() => <i data-body />);
    const html = draw(<Page />);
    expect(html).toContain(`<h1 class="sr-only">${title}</h1>`);
    expect(html).toContain("data-body");
  });

  it("shows its skeleton while the data is read", () => {
    body.mockImplementation(() => {
      throw new Promise(() => undefined);
    });
    expect(draw(<Page />)).toContain(`data-skeleton="${skeleton}"`);
  });
});
