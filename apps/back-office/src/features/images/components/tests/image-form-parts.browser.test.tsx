// @module-tag integration

import { App, ImageAccess } from "@allonfire/database/enums";
import { useAOFForm } from "@allonfire/ui/features/form/utils/form";
import { page } from "vitest/browser";
import { renderInApp } from "@/shared/tests/render-in-app";
import { enT } from "@/shared/tests/translators";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import { IMAGES } from "../../constants/images";
import { appIn, appToggle } from "../../tests/app-toggle";
import { ImageAltFields } from "../image-alt-fields";
import { ImageAccessRow, ImageAppsRow } from "../image-form-parts";

vi.mock(
  "@/features/i18n/navigation",
  () => import("../../tests/image-form-mocks")
);

const FORM = EN.Images.form;
const START_ACCESS: ImageAccess = ImageAccess.PRIVATE;
const FRENCH = /French/;
const GERMAN = /German/;
const ALT = { en: "The sea", it: "Il mare" };

const Harness = ({
  alt = ALT,
  offered = [App.BACK_OFFICE, App.LAURA],
}: {
  alt?: Record<string, string>;
  offered?: readonly App[];
}) => {
  const form = useAOFForm({
    defaultValues: {
      access: START_ACCESS,
      alt: { en: "", it: "", ...alt },
      apps: [App.BACK_OFFICE],
      picker: "",
    },
  });
  return (
    <form aria-label="image">
      <ImageAltFields fields={IMAGES.FORM_FIELDS.EDIT} form={form} />
      <ImageAccessRow fields={IMAGES.FORM_FIELDS.EDIT} form={form} />
      <ImageAppsRow
        fields={IMAGES.FORM_FIELDS.EDIT}
        form={form}
        offered={offered}
      />
    </form>
  );
};

const altField = (language: string) =>
  page.getByRole("textbox", { name: language });

describe("ImageAltFields", () => {
  it("shows English and Italian, with the text they hold", async () => {
    renderInApp({ children: <Harness /> });
    await expect.element(altField("English")).toHaveValue(ALT.en);
    await expect.element(altField("italiano")).toHaveValue(ALT.it);
  });

  it("adds a language from the picker and removes it again", async () => {
    renderInApp({ children: <Harness /> });
    await page.getByRole("combobox", { name: FORM.addLanguage }).fill("French");
    await page.getByRole("option", { name: FRENCH }).click();
    await expect.element(altField("français")).toBeVisible();
    await page
      .getByRole("button", {
        name: enT("Images.form.removeLanguage", { language: "français" }),
      })
      .click();
    await expect.element(altField("français")).not.toBeInTheDocument();
  });

  it("clears a language's text from the button at its end, and keeps the caret in it", async () => {
    renderInApp({ children: <Harness /> });
    await page
      .getByRole("button", {
        name: enT("Images.form.clearAlt", { language: "English" }),
      })
      .click();
    await expect.element(altField("English")).toHaveValue("");
    await expect.element(altField("English")).toHaveFocus();
    await expect
      .element(
        page.getByRole("button", {
          name: enT("Images.form.clearAlt", { language: "English" }),
        })
      )
      .not.toBeInTheDocument();
    await expect.element(altField("italiano")).toHaveValue(ALT.it);
  });

  it("sets the remove button level with its input, the same height", async () => {
    renderInApp({ children: <Harness alt={{ ...ALT, fr: "La mer" }} /> });
    await expect.element(altField("français")).toBeVisible();
    const input = altField("français").element().getBoundingClientRect();
    const button = page
      .getByRole("button", {
        name: enT("Images.form.removeLanguage", { language: "français" }),
      })
      .element()
      .getBoundingClientRect();
    expect(button.top).toBeCloseTo(input.top, 0);
    expect(button.height).toBeCloseTo(input.height, 0);
  });

  it("does not offer a language the Image already holds", async () => {
    renderInApp({ children: <Harness alt={{ ...ALT, fr: "La mer" }} /> });
    await page.getByRole("combobox", { name: FORM.addLanguage }).fill("French");
    await expect
      .element(page.getByRole("option", { name: FRENCH }))
      .not.toBeInTheDocument();
  });

  it("starts on the extra languages the Image holds, with their text", async () => {
    renderInApp({ children: <Harness alt={{ ...ALT, fr: "La mer" }} /> });
    await expect.element(altField("français")).toHaveValue("La mer");
  });

  it("keeps what was typed when another language is added", async () => {
    renderInApp({ children: <Harness /> });
    await altField("English").fill("Typed");
    await page.getByRole("combobox", { name: FORM.addLanguage }).fill("German");
    await page.getByRole("option", { name: GERMAN }).click();
    await expect.element(altField("English")).toHaveValue("Typed");
  });
});

describe("ImageAppsRow", () => {
  it("offers only the Apps it is given, the Image's own switched on", async () => {
    renderInApp({ children: <Harness offered={[App.BACK_OFFICE]} /> });
    await expect
      .element(appIn(page, App.BACK_OFFICE))
      .toHaveAttribute("aria-current", "page");
    await expect.element(appToggle(page, App.LAURA)).not.toBeInTheDocument();
  });

  it("switches an App on and off", async () => {
    renderInApp({ children: <Harness /> });
    await appIn(page, App.LAURA).click();
    await expect
      .element(appIn(page, App.LAURA))
      .toHaveAttribute("aria-current", "page");
    await appToggle(page, App.LAURA)
      .getByRole("button", { exact: true, name: FORM.appOut })
      .click();
    await expect
      .element(appIn(page, App.LAURA))
      .not.toHaveAttribute("aria-current");
  });
});

describe("ImageAccessRow", () => {
  it("offers public and private", async () => {
    renderInApp({ children: <Harness /> });
    const row = page.getByRole("radiogroup", { name: FORM.access });
    await expect
      .element(row.getByRole("button", { name: EN.Images.access.PUBLIC }))
      .toBeVisible();
    await expect
      .element(row.getByRole("button", { name: EN.Images.access.PRIVATE }))
      .toBeVisible();
  });
});
