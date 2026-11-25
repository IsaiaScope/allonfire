// @module-tag unit
// @vitest-environment node
import { Role } from "@allonfire/database/enums";
import { renderToStaticMarkup } from "react-dom/server";
import { hasSectionRole } from "@/shared/tests/mocks/section-role";
import { requireAppSession } from "@/shared/tests/mocks/section-session";
import { GALLERY } from "../../constants/gallery";
import { GalleryList } from "../gallery-list";

vi.mock(
  "@allonfire/auth/features/next/utils/session",
  () => import("@/shared/tests/mocks/section-session")
);
vi.mock(
  "@allonfire/auth/features/next/utils/has-section-role",
  () => import("@/shared/tests/mocks/section-role")
);
// The boundary reads the page's hydration; the feed is a client leaf.
vi.mock(
  "@allonfire/core/features/next/query/components/aof-hydrated-boundary",
  () => import("@/shared/tests/mocks/hydrated-boundary")
);
vi.mock("../gallery-feed", () => ({
  GalleryFeed: ({ canMark, source }: { canMark: boolean; source: string }) => (
    <i data-can-mark={canMark} data-source={source} />
  ),
}));

const session = { user: { id: "u1" } };
const readFirstPage = vi.fn(() =>
  Promise.resolve({ mutations: [], queries: [] })
);

/** The list as the page renders it. */
const render = async (source: "favorites" | "gallery") =>
  renderToStaticMarkup(await GalleryList({ hydration: readFirstPage, source }));

beforeEach(() => {
  requireAppSession.mockResolvedValue(session);
  readFirstPage.mockClear();
});

describe("GalleryList", () => {
  it.each([
    ["an Admin", Role.ADMIN, true],
    ["a User", Role.USER, false],
  ])("lets %s mark photos: %s", async (_, role, expected) => {
    hasSectionRole.mockImplementation(
      (_session: unknown, minRole: unknown) =>
        role === minRole || role === Role.ADMIN
    );
    const html = await render(GALLERY.SOURCE.GALLERY);
    expect(hasSectionRole).toHaveBeenCalledWith(session, Role.ADMIN);
    expect(html).toContain(`data-can-mark="${expected}"`);
  });

  it.each([GALLERY.SOURCE.GALLERY, GALLERY.SOURCE.FAVORITES])(
    "hands the %s feed the page's own hydration, keeping the loaded pages",
    async (source) => {
      hasSectionRole.mockReturnValue(false);
      const html = await render(source);
      expect(readFirstPage).toHaveBeenCalledOnce();
      expect(html).toContain(`data-source="${source}"`);
      expect(html).toContain('data-only-missing="true"');
    }
  );
});
