// @module-tag integration

import { worker } from "@allonfire/config/tests/browser/msw";
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { formatSize } from "@allonfire/core/shared/utils/format-size";
import { App } from "@allonfire/database/enums";
import { HttpResponse, http } from "msw";
import { NextIntlClientProvider } from "next-intl";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { IMAGES_PAGE, IMAGES_URL } from "@/shared/tests/msw/handlers";
import { renderInApp } from "@/shared/tests/render-in-app";
import { enT } from "@/shared/tests/translators";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import IT from "../../../i18n/translations/it.json" with { type: "json" };
import { deleteImages } from "../../actions/delete-images";
import { IMAGES } from "../../constants/images";
import { newImageHref } from "../../utils/image-href";
import { ImagesListSkeleton } from "../images-list-skeleton";
import { ImagesTable } from "../images-table";

const t = EN.Images;
/** A row's checkbox name in Italian: the label, then the alt's Italian. */
const ITALIAN_SEA = /Il mare/;
/** The list's answer when nobody matches. */
/** A search typed any way, and the canonical spelling the address keeps. */
const SEARCHED = "APP:Laura access:Public sea";
const SEARCHED_CLEAN = "access:public app:laura input:sea";
const NOBODY = {
  ...IMAGES_PAGE,
  images: [],
  pageCount: 0,
  total: 0,
  totalBytes: 0,
};
/** A list two pages long with nobody on the page asked for. */
const PAST_THE_END = `?${IMAGES.PARAM.PAGE}=5`;

// A server action: covered for real by e2e.
vi.mock("../../actions/delete-images", () => ({ deleteImages: vi.fn() }));
vi.mock(
  "@/features/i18n/navigation",
  () => import("@/shared/tests/navigation-mock")
);
// A stored Image is drawn through the image server: here, a mark with its alt.
vi.mock("@allonfire/ui/shared/components/aof-image", async () => ({
  ...(await import("@/shared/tests/aof-image-mock")),
  AOFStorageImage: ({ image }: { image: { alt: { en: string } } }) => (
    <span data-alt={image.alt.en} data-testid="picture" />
  ),
}));

/** Every query the list sends, as its search params, while the API answers the page. */
const listAsked = () => {
  const asked: URLSearchParams[] = [];
  worker.use(
    http.get(IMAGES_URL, ({ request }) => {
      asked.push(new URL(request.url).searchParams);
      return HttpResponse.json(IMAGES_PAGE);
    })
  );
  return asked;
};

const renderAt = ({
  language = I18N.DEFAULT_LANGUAGE,
  search = "",
}: {
  language?: "en" | "it";
  search?: string;
} = {}) =>
  renderInApp({
    children: <ImagesTable />,
    language,
    messages: language === "it" ? IT : EN,
    search,
  });

beforeEach(() =>
  page.viewport(SCREEN.VIEWPORT.DESKTOP.WIDTH, SCREEN.VIEWPORT.DESKTOP.HEIGHT)
);

describe("ImagesTable", () => {
  it("names a row's checkbox by its alt in the visitor's language", async () => {
    const screen = await renderAt({ language: "it" });
    await expect
      .element(screen.getByRole("checkbox", { name: ITALIAN_SEA }))
      .toBeVisible();
    expect(screen.container.textContent).not.toContain("Select The sea");
  });

  it("shows each Image's stored file name, alt, dimensions, size in megabytes, access, Apps and date", async () => {
    const screen = await renderAt();
    const table = screen.getByRole("table", { name: t.list });
    await expect.element(table).toBeVisible();
    await Promise.all(
      [
        t.column.image,
        t.column.name,
        t.column.alt,
        t.column.dimensions,
        t.column.size,
        t.column.access,
        t.column.apps,
      ].map((header) =>
        expect.element(table.getByText(header, { exact: true })).toBeVisible()
      )
    );
    const [sea] = IMAGES_PAGE.images;
    await expect
      .element(table.getByText(sea?.alt.en ?? "", { exact: true }))
      .toBeVisible();
    await expect
      .element(table.getByText(sea?.key ?? "", { exact: true }))
      .toBeVisible();
    await expect
      .element(table.getByText(`${sea?.width} × ${sea?.height}`))
      .toBeVisible();
    await expect
      .element(table.getByText(formatSize(sea?.bytes ?? 0)))
      .toBeVisible();
    await expect.element(table.getByText(t.access.PUBLIC)).toBeVisible();
  });

  it("holds every column to its width: a very long alt is cut to an ellipsis, never stretches the row", async () => {
    const [sea] = IMAGES_PAGE.images;
    const long = "A very long description ".repeat(20);
    worker.use(
      http.get(IMAGES_URL, () =>
        HttpResponse.json({
          ...IMAGES_PAGE,
          images: sea
            ? [
                {
                  ...sea,
                  alt: { en: long, it: long },
                  apps: [App.LAURA, App.BACK_OFFICE],
                },
              ]
            : [],
        })
      )
    );
    const screen = await renderAt();
    const altBox = () =>
      screen.container.querySelector("tbody tr:first-child td:nth-child(4) a");
    await expect.poll(altBox).not.toBeNull();
    const alt = altBox()?.parentElement;
    // The value is cut at the column's maxSize (320), however long it is; the
    // cell around it may take the room the table has left over.
    expect(alt?.getBoundingClientRect().width).toBeLessThanOrEqual(320);
    expect(alt?.scrollWidth).toBeGreaterThan(alt?.clientWidth ?? 0);
  });

  it("holds each picture to its square, 48px, whatever the picture's own shape", async () => {
    const screen = await renderAt();
    const picture = screen.getByTestId("picture").first();
    await expect.element(picture).toBeInTheDocument();
    const tile = picture.element().parentElement;
    const { height, width } = tile?.getBoundingClientRect() ?? {
      height: 0,
      width: 0,
    };
    expect([width, height]).toEqual([48, 48]);
  });

  it("copies an Image's stored file name on a click, and says so in the tip", async () => {
    const writeText = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue();
    const screen = await renderAt();
    const [sea] = IMAGES_PAGE.images;
    const copy = screen
      .getByRole("table", { name: t.list })
      .getByRole("button", {
        name: enT("Images.copy.label", { name: sea?.key ?? "" }),
      });
    await copy.click();
    expect(writeText).toHaveBeenCalledWith(sea?.key);
    await expect.element(page.getByText(t.copy.done)).toBeVisible();
  });

  it("opens an Image from its alt, as a link", async () => {
    const screen = await renderAt();
    const [sea] = IMAGES_PAGE.images;
    await expect
      .element(screen.getByRole("link", { name: sea?.alt.en ?? "" }))
      .toHaveAttribute("href", expect.stringContaining(sea?.id ?? ""));
  });

  it("links the Add button to the upload page", async () => {
    const screen = await renderAt();
    await expect
      .element(screen.getByRole("link", { name: t.add.button }))
      .toHaveAttribute("href", newImageHref());
  });
});

describe("ImagesTable states and actions", () => {
  it("searches the alt text: typing asks the API for it, after typing rests", async () => {
    const asked = listAsked();
    const screen = await renderAt();
    await screen.getByRole("searchbox", { name: t.search.label }).fill("sea");
    await expect
      .poll(() => asked.at(-1)?.get(IMAGES.PARAM.SEARCH))
      .toBe("input:sea");
  });

  it("keeps the search box filled from the address, and the cross empties it", async () => {
    const screen = await renderAt({ search: `?${IMAGES.PARAM.SEARCH}=hills` });
    const box = screen.getByRole("searchbox", { name: t.search.label });
    await expect.element(box).toHaveValue("hills");
    await screen.getByRole("button", { name: t.search.clear }).click();
    await expect.element(box).toHaveValue("");
  });

  it("asks the API for the whole search chosen in the address, filters and words", async () => {
    const asked = listAsked();
    await renderAt({ search: `?${IMAGES.PARAM.SEARCH}=${SEARCHED}` });
    await expect
      .poll(() => asked.at(-1)?.get(IMAGES.PARAM.SEARCH))
      .toBe(SEARCHED_CLEAN);
  });

  it("turns a field typed in the box into its filter, and keeps the words", async () => {
    const asked = listAsked();
    const screen = await renderAt();
    const box = screen.getByRole("searchbox", { name: t.search.label });
    await box.fill("access:public sea");
    await expect
      .poll(() => asked.at(-1)?.get(IMAGES.PARAM.SEARCH))
      .toBe("access:public input:sea");
    await expect.element(box).toHaveValue("sea");
  });

  it("says no Image matches, with a button that clears the filter", async () => {
    worker.use(http.get(IMAGES_URL, () => HttpResponse.json(NOBODY)));
    const screen = await renderAt({
      search: `?${IMAGES.PARAM.SEARCH}=app:${App.LAURA.toLowerCase()}`,
    });
    await expect.element(screen.getByText(t.empty.title)).toBeVisible();
    await screen.getByRole("button", { name: t.empty.clear }).click();
    await expect.element(screen.getByText(t.empty.title)).toBeVisible();
  });

  it("steps back to the last page that exists when the page is past it", async () => {
    const asked: string[] = [];
    worker.use(
      http.get(IMAGES_URL, ({ request }) => {
        const asking = new URL(request.url).searchParams.get(IMAGES.PARAM.PAGE);
        asked.push(String(asking));
        return HttpResponse.json(
          Number(asking) > 2
            ? { ...IMAGES_PAGE, images: [], pageCount: 2 }
            : { ...IMAGES_PAGE, pageCount: 2 }
        );
      })
    );
    const screen = await renderAt({ search: PAST_THE_END });
    await expect.poll(() => asked.at(-1)).toBe("2");
    await expect
      .element(screen.getByText(IMAGES_PAGE.images[0]?.alt.en ?? "").first())
      .toBeVisible();
  });

  it("enables Delete only while a row is selected, and asks first", async () => {
    const screen = await renderAt();
    const del = screen.getByRole("button", {
      exact: true,
      name: t.delete.action,
    });
    await expect.element(del).toBeDisabled();
    const [sea] = IMAGES_PAGE.images;
    await screen
      .getByRole("checkbox", {
        name: enT("Images.delete.select", { alt: sea?.alt.en ?? "" }),
      })
      .click();
    await expect.element(del).toBeEnabled();
    vi.mocked(deleteImages).mockResolvedValue(1);
    await del.click();
    await expect
      .element(page.getByText(enT("Images.delete.title", { count: 1 })))
      .toBeVisible();
    await page.getByRole("button", { name: t.delete.confirm }).click();
    await expect.poll(() => vi.mocked(deleteImages).mock.calls.length).toBe(1);
    expect(vi.mocked(deleteImages).mock.calls[0]?.[0]).toEqual([sea?.id]);
  });

  it("its skeleton draws as many columns as the table", async () => {
    const screen = await renderAt();
    const table = screen.getByRole("table", { name: t.list });
    await expect.element(table.getByText(t.column.image)).toBeVisible();
    const skeleton = await render(
      <NextIntlClientProvider locale={I18N.DEFAULT_LANGUAGE} messages={EN}>
        <ImagesListSkeleton />
      </NextIntlClientProvider>
    );
    const head = skeleton.container.querySelector(
      '[data-slot="aof-data-table-skeleton"] .grid'
    );
    expect(head?.children.length).toBe(
      table.element().querySelectorAll("th").length
    );
  });
});
