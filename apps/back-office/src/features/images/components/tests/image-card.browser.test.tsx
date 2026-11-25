// @module-tag integration

import { DATE } from "@allonfire/core/features/i18n/constants/dates";
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { aofMessages } from "@allonfire/core/features/next/i18n/utils/aof-translators";
import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { formatSize } from "@allonfire/core/shared/utils/format-size";
import { App, ImageAccess } from "@allonfire/database/enums";
import type { ImageBody } from "@allonfire/storage/features/image/constants/schemas";
import { NextIntlClientProvider } from "next-intl";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { enT } from "@/shared/tests/translators";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import { ImageCard } from "../image-card";

vi.mock("@/features/i18n/navigation", async () => ({
  Link: (await import("@allonfire/ui/shared/tests/link-mock")).LinkMock,
}));
// A stored Image is drawn through the image server: here, a tile the picture's size.
vi.mock("@allonfire/ui/shared/components/aof-image", async () => ({
  AOFImage: (await import("@allonfire/ui/shared/tests/image-mock")).ImageMock,
  AOFStorageImage: ({
    className,
    placeholder,
  }: {
    className?: string;
    placeholder?: string;
  }) => (
    <span
      className={className}
      data-placeholder={placeholder}
      data-testid="picture"
    />
  ),
}));

const LONG = "A very long description of the picture ".repeat(12);
const IMAGE: ImageBody = {
  access: ImageAccess.PUBLIC,
  alt: { en: LONG, it: LONG },
  apps: [App.LAURA, App.BACK_OFFICE],
  blurDataUrl: "data:image/webp;base64,AAAA",
  bytes: 1_500_000,
  createdAt: "2026-10-02T10:00:00.000Z",
  height: 600,
  id: "image-long",
  key: "0b9a0c3e-0000-4000-8000-0000000000aa.avif",
  srcSet: [{ url: "https://cdn.test/long-400.avif", width: 400 }],
  version: "version-long",
  width: 800,
};

/** A description with no space to break at. */
/** One line of the description: `text-base` (16px) at `leading-snug`. */
const ALT_LINE_PX = 22;
const UNBROKEN = "Superlongunbrokenstring".repeat(8);

const renderCard = (image: ImageBody = IMAGE) =>
  render(
    <NextIntlClientProvider
      formats={DATE.FORMAT.INTL}
      locale={I18N.DEFAULT_LANGUAGE}
      messages={aofMessages(I18N.DEFAULT_LANGUAGE, EN)}
      timeZone={DATE.TIME_ZONE}
    >
      <div className="w-97.5">
        <ImageCard image={image} />
      </div>
    </NextIntlClientProvider>
  );

/** A card whose picture has no alt text. */
const renderNoAlt = () =>
  render(
    <NextIntlClientProvider
      formats={DATE.FORMAT.INTL}
      locale={I18N.DEFAULT_LANGUAGE}
      messages={aofMessages(I18N.DEFAULT_LANGUAGE, EN)}
      timeZone={DATE.TIME_ZONE}
    >
      <div className="w-97.5">
        <ImageCard image={{ ...IMAGE, alt: { en: "", it: "" } }} />
      </div>
    </NextIntlClientProvider>
  );

beforeEach(() =>
  page.viewport(SCREEN.VIEWPORT.PHONE.WIDTH, SCREEN.VIEWPORT.PHONE.HEIGHT)
);

describe("ImageCard", () => {
  it("names the picture by its stored file's name, a click copying it, beside the picture", async () => {
    const writeText = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue();
    const screen = await renderCard();
    const copy = screen.getByRole("button", {
      name: enT("Images.copy.label", { name: IMAGE.key }),
    });
    await expect.element(copy).toBeVisible();
    const picture = screen
      .getByTestId("picture")
      .element()
      .getBoundingClientRect();
    expect(copy.element().getBoundingClientRect().left).toBeGreaterThan(
      picture.right
    );
    await copy.click();
    expect(writeText).toHaveBeenCalledWith(IMAGE.key);
  });

  it("says the picture has no alt text when it has none", async () => {
    const screen = await renderNoAlt();
    await expect
      .element(screen.getByText(EN.Images.column.noAlt, { exact: true }))
      .toBeVisible();
  });

  it("lets the name run over two lines at most", async () => {
    const screen = await renderCard();
    const name = screen.getByText(IMAGE.key, { exact: true }).element();
    expect(getComputedStyle(name).webkitLineClamp).toBe("2");
  });

  it("keeps a description of one long word on one line inside the card, ending in an ellipsis, never split", async () => {
    const screen = await renderCard({
      ...IMAGE,
      alt: { en: UNBROKEN, it: UNBROKEN },
    });
    const alt = screen.getByText(UNBROKEN, { exact: true }).element();
    const card = alt.closest('[data-slot="card"]') ?? document.body;
    expect(alt.getBoundingClientRect().right).toBeLessThanOrEqual(
      card.getBoundingClientRect().right
    );
    expect(alt.getBoundingClientRect().height).toBeLessThanOrEqual(ALT_LINE_PX);
    expect(getComputedStyle(alt).textOverflow).toBe("ellipsis");
  });

  it("keeps the picture's blur behind it, so a picture that does not fill its square sits on its own colours", async () => {
    const screen = await renderCard();
    const tile =
      screen.getByTestId("picture").element().parentElement ?? document.body;
    expect(getComputedStyle(tile).backgroundImage).toContain(IMAGE.blurDataUrl);
  });

  it("leaves the blur to its tile: the picture asks for none of its own, so the blur does not change when it loads", async () => {
    const screen = await renderCard();
    await expect
      .element(screen.getByTestId("picture"))
      .toHaveAttribute("data-placeholder", "empty");
  });

  it("fits the whole picture in its square, never cropping its shape", async () => {
    const screen = await renderCard();
    const picture = screen.getByTestId("picture").element();
    expect(getComputedStyle(picture).objectFit).toBe("contain");
  });

  it("draws the picture large, a side of 120px", async () => {
    const screen = await renderCard();
    const picture = screen.getByTestId("picture").element().parentElement;
    expect(picture?.getBoundingClientRect().width).toBeGreaterThanOrEqual(120);
  });

  it("puts the alt and access beside the picture, and the size, dimensions and Apps under both", async () => {
    const screen = await renderCard();
    const picture = screen
      .getByTestId("picture")
      .element()
      .getBoundingClientRect();
    const alt = screen
      .getByRole("link", { name: LONG.trim() })
      .element()
      .getBoundingClientRect();
    expect(alt.left).toBeGreaterThan(picture.right);
    await expect
      .element(screen.getByText(EN.Images.access.PUBLIC))
      .toBeVisible();
    for (const value of [
      formatSize(IMAGE.bytes),
      `${IMAGE.width} × ${IMAGE.height}`,
      "Laura, Back Office",
    ]) {
      const box = screen.getByText(value).element().getBoundingClientRect();
      expect(box.top).toBeGreaterThanOrEqual(picture.bottom);
    }
  });

  it("labels each value and never separates them with a middle dot", async () => {
    const screen = await renderCard();
    await Promise.all(
      [
        EN.Images.column.size,
        EN.Images.column.dimensions,
        EN.Images.column.apps,
      ].map((label) => expect.element(screen.getByText(label)).toBeVisible())
    );
    expect(screen.container.textContent).not.toContain("·");
  });

  it("cuts a long description to two lines", async () => {
    const screen = await renderCard();
    const alt = screen.getByRole("link", { name: LONG.trim() }).element();
    const style = getComputedStyle(alt.firstElementChild ?? alt);
    expect(style.webkitLineClamp).toBe("2");
  });
});

describe("ImageCard, laid out", () => {
  it("never lets a long name and a long alt push the text past the picture, so no card shifts the list", async () => {
    const screen = await renderCard();
    const tile =
      screen.getByTestId("picture").element().parentElement ?? document.body;
    const text = tile.nextElementSibling?.getBoundingClientRect();
    const picture = tile.getBoundingClientRect();
    expect(text?.height ?? 0).toBeLessThanOrEqual(picture.height + 1);
    expect(Math.abs((text?.bottom ?? 0) - picture.bottom)).toBeLessThanOrEqual(
      2
    );
  });

  it("lines the name, alt and access up with the picture: the same top and bottom for a short alt", async () => {
    const screen = await renderNoAlt();
    const tile =
      screen.getByTestId("picture").element().parentElement ?? document.body;
    const column = tile.nextElementSibling;
    const picture = tile.getBoundingClientRect();
    const text = column?.getBoundingClientRect();
    expect(Math.abs((text?.top ?? 0) - picture.top)).toBeLessThanOrEqual(2);
    expect(Math.abs((text?.bottom ?? 0) - picture.bottom)).toBeLessThanOrEqual(
      2
    );
  });

  it("spreads the name, alt and access over the picture's height: the name at its top, the access at its foot", async () => {
    const screen = await renderNoAlt();
    const tile =
      screen.getByTestId("picture").element().parentElement ?? document.body;
    const column = tile.nextElementSibling;
    expect(getComputedStyle(column ?? tile).justifyContent).toBe(
      "space-between"
    );
    const picture = tile.getBoundingClientRect();
    const last = column?.lastElementChild?.getBoundingClientRect();
    expect(Math.abs((last?.bottom ?? 0) - picture.bottom)).toBeLessThanOrEqual(
      2
    );
  });

  it("holds the same room above the divider as under it, and the rows of facts close together", async () => {
    const screen = await renderNoAlt();
    const details = screen.getByRole("term").first().element().closest("dl");
    const block = details?.previousElementSibling?.getBoundingClientRect();
    const rule = details?.getBoundingClientRect();
    const firstLabel = details?.querySelector("dt")?.getBoundingClientRect();
    const above = (rule?.top ?? 0) - (block?.bottom ?? 0);
    const below = (firstLabel?.top ?? 0) - (rule?.top ?? 0);
    expect(Math.abs(above - below)).toBeLessThanOrEqual(4);
    const rows = [...(details?.querySelectorAll("dt") ?? [])].map((label) =>
      Math.round(label.getBoundingClientRect().top)
    );
    const second = rows.find((top) => top > (rows[0] ?? 0));
    // About 8px between one row's value and the next row's label (a browser rounds the lines a little differently).
    const firstValue = details?.querySelector("dd")?.getBoundingClientRect();
    expect((second ?? 0) - (firstValue?.bottom ?? 0)).toBeLessThanOrEqual(9);
  });
});
