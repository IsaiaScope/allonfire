// @module-tag integration

import { worker } from "@allonfire/config/tests/browser/msw";
import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { HttpResponse, http } from "msw";
import type { UrlUpdateEvent } from "nuqs/adapters/testing";
import { page } from "vitest/browser";
import { IMAGES_PAGE, IMAGES_URL } from "@/shared/tests/msw/handlers";
import { renderInApp } from "@/shared/tests/render-in-app";
import { enT } from "@/shared/tests/translators";
import { watchWarnings } from "@/shared/tests/watch-warnings";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import { deleteImages } from "../../actions/delete-images";
import { IMAGES } from "../../constants/images";
import { ImagesTable } from "../images-table";

const t = EN.Images;
const [TEMPLATE] = IMAGES_PAGE.images;
const PER_PAGE = IMAGES.DEFAULT_PAGE_SIZE;

// jscpd:ignore-start
// vi.mock is hoisted per file, so a test file states its own mocks.
vi.mock("../../actions/delete-images", () => ({ deleteImages: vi.fn() }));
vi.mock(
  "@/features/i18n/navigation",
  () => import("@allonfire/ui/shared/tests/navigation-mock")
);
vi.mock("@allonfire/ui/shared/components/aof-image", async () => ({
  ...(await import("@allonfire/ui/shared/tests/aof-image-mock")),
  AOFStorageImage: ({ image }: { image: { alt: { en: string } } }) => (
    <span data-alt={image.alt.en} data-testid="picture" />
  ),
}));
// jscpd:ignore-end

/** `count` Images, numbered, newest first as the API lists them. */
const imagesOf = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    ...(TEMPLATE ?? IMAGES_PAGE.images[0]),
    alt: { en: `Photo ${index + 1}`, it: `Foto ${index + 1}` },
    id: `image-${index + 1}`,
    key: `0b9a0c3e-0000-4000-8000-${String(index + 1).padStart(12, "0")}.avif`,
  }));

/**
 * A fake API that remembers: the list pages as the real one does (a page past
 * the end answers no Image and the true page count) and a delete removes the
 * Images for good.
 */
const fakeApi = (count: number) => {
  let stored = imagesOf(count);
  worker.use(
    http.get(IMAGES_URL, ({ request }) => {
      const query = new URL(request.url).searchParams;
      const number = Number(query.get(IMAGES.PARAM.PAGE) ?? 1);
      const size = Number(query.get(IMAGES.PARAM.PER_PAGE) ?? PER_PAGE);
      return HttpResponse.json({
        images: stored.slice((number - 1) * size, number * size),
        page: number,
        pageCount: Math.ceil(stored.length / size),
        total: stored.length,
        totalBytes: stored.length * (TEMPLATE?.bytes ?? 0),
      });
    })
  );
  vi.mocked(deleteImages).mockImplementation((ids) => {
    stored = stored.filter(({ id }) => !ids.includes(id));
    return Promise.resolve(ids.length);
  });
  return () => stored.length;
};

/** The words the list must never show on its way back: no Image match, or a failure. */
const WARNINGS = [t.empty.title, t.error.title, t.delete.failed];

/** The page the address names after its last update (the first when it names none). */
const pageIn = (updates: UrlUpdateEvent[]) =>
  Number(
    updates.at(-1)?.searchParams.get(IMAGES.PARAM.PAGE) ?? IMAGES.DEFAULT_PAGE
  );

const openLastPage = (updates: UrlUpdateEvent[]) =>
  renderInApp({
    children: <ImagesTable />,
    onUrlUpdate: (event) => updates.push(event),
    search: `?${IMAGES.PARAM.PAGE}=2`,
  });

beforeEach(() => {
  vi.mocked(deleteImages).mockReset();
  return page.viewport(
    SCREEN.VIEWPORT.DESKTOP.WIDTH,
    SCREEN.VIEWPORT.DESKTOP.HEIGHT
  );
});

/** Confirms the delete and waits for page 1 to show; answers where the list ended up and what warned on the way. */
const confirmAndSettle = async ({
  left,
  screen,
  updates,
  warnings,
}: {
  left: () => number;
  screen: Awaited<ReturnType<typeof openLastPage>>;
  updates: UrlUpdateEvent[];
  warnings: ReturnType<typeof watchWarnings>;
}) => {
  await page.getByRole("button", { name: t.delete.confirm }).click();
  await vi.waitFor(() => {
    screen
      .getByRole("checkbox", {
        exact: true,
        name: enT("Images.delete.select", { alt: "Photo 1" }),
      })
      .element();
    if (pageIn(updates) !== 1) {
      throw new Error("The list is not back on page 1 yet.");
    }
  });
  return { left: left(), page: pageIn(updates), warnings: warnings.seen() };
};

const WENT_BACK = { left: PER_PAGE, page: 1, warnings: [] };

describe("deleting every Image on the last page", () => {
  it("goes back to the previous page, whose Images show, with no empty notice and no error", async () => {
    const left = fakeApi(PER_PAGE + 1);
    const updates: UrlUpdateEvent[] = [];
    const warnings = watchWarnings(WARNINGS);
    const screen = await openLastPage(updates);
    const only = `Photo ${PER_PAGE + 1}`;
    await screen
      .getByRole("checkbox", {
        name: enT("Images.delete.select", { alt: only }),
      })
      .click();
    await screen
      .getByRole("button", { exact: true, name: t.delete.action })
      .click();
    expect(await confirmAndSettle({ left, screen, updates, warnings })).toEqual(
      WENT_BACK
    );
  });

  it("does the same when the last page held several Images and all are selected", async () => {
    const left = fakeApi(PER_PAGE + 3);
    const updates: UrlUpdateEvent[] = [];
    const warnings = watchWarnings(WARNINGS);
    const screen = await openLastPage(updates);
    await screen.getByRole("checkbox", { name: t.delete.selectAll }).click();
    await screen
      .getByRole("button", { exact: true, name: t.delete.action })
      .click();
    expect(await confirmAndSettle({ left, screen, updates, warnings })).toEqual(
      WENT_BACK
    );
  });
});
