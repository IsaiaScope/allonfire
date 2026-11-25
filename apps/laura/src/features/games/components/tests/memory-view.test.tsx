// @module-tag unit
// @vitest-environment node
import { Role } from "@allonfire/database/enums";
import { renderToStaticMarkup } from "react-dom/server";
import { hasSectionRole } from "@/shared/tests/mocks/section-role";
import { requireAppSession } from "@/shared/tests/mocks/section-session";
import { MemoryView } from "../memory-view";

vi.mock(
  "@allonfire/auth/features/next/utils/session",
  () => import("@/shared/tests/mocks/section-session")
);
vi.mock(
  "@allonfire/auth/features/next/utils/has-section-role",
  () => import("@/shared/tests/mocks/section-role")
);
// The boundary reads the page's hydration; the board is a client leaf.
vi.mock(
  "@allonfire/core/features/next/query/components/aof-hydrated-boundary",
  () => import("@/shared/tests/mocks/hydrated-boundary")
);
vi.mock("../memory-board", () => ({
  MemoryBoard: ({ canUpload }: { canUpload: boolean }) => (
    <i data-can-upload={canUpload} />
  ),
}));

const session = { user: { id: "u1" } };
const readLeaderboard = vi.fn(() =>
  Promise.resolve({ mutations: [], queries: [] })
);

const render = async () =>
  renderToStaticMarkup(await MemoryView({ hydration: readLeaderboard }));

beforeEach(() => {
  requireAppSession.mockResolvedValue(session);
  readLeaderboard.mockClear();
});

describe("MemoryView", () => {
  it.each([
    ["an Admin", Role.ADMIN, true],
    ["a User", Role.USER, false],
  ])(
    "points %s to Upload when photos are missing: %s",
    async (_, role, expected) => {
      hasSectionRole.mockImplementation(
        (_session: unknown, minRole: unknown) =>
          role === minRole || role === Role.ADMIN
      );
      const html = await render();
      expect(hasSectionRole).toHaveBeenCalledWith(session, Role.ADMIN);
      expect(html).toContain(`data-can-upload="${expected}"`);
    }
  );

  it("hands the board the page's own leaderboard hydration, on the plain boundary", async () => {
    hasSectionRole.mockReturnValue(false);
    const html = await render();
    expect(readLeaderboard).toHaveBeenCalledOnce();
    // One body with no loaded pages: nothing for `onlyMissing` to protect.
    expect(html).not.toContain("data-only-missing");
  });
});
