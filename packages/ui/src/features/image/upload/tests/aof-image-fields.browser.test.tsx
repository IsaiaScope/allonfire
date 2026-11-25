// @module-tag integration

import { App, ImageAccess } from "@allonfire/database/enums";
import { type Locator, page } from "vitest/browser";
import { renderInUi } from "../../../../shared/tests/render-in-ui";
import { useAOFForm } from "../../../form/utils/form";
import { AOFImageAccessRow } from "../components/aof-image-access-row";
import { AOFImageAltFields } from "../components/aof-image-alt-fields";
import { AOFImageAppsRow } from "../components/aof-image-apps-row";
import { appIn, appToggle } from "./app-toggle";
import { fieldsCopy } from "./image-upload-copy";

/** The names the group's fields are bound under in this form. */
const FIELDS = {
  access: "access",
  alt: "alt",
  apps: "apps",
  picker: "picker",
} as const;
const START_ACCESS: ImageAccess = ImageAccess.PRIVATE;
const FRENCH = /French/;
const GERMAN = /German/;
const ALT = { en: "The sea", it: "Il mare" };
const SHELL = { name: "Shell" } as const;
const REEF = { name: "Reef" } as const;
const OPTIONS = [
  { label: SHELL.name, value: App.BACK_OFFICE },
  { label: REEF.name, value: App.LAURA },
] as const;
const COLOURS = { ink: "#112233", pill: "#445566" } as const;

const Harness = ({
  alt = ALT,
  options = OPTIONS,
}: {
  alt?: Record<string, string>;
  options?: readonly { label: string; value: App }[];
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
      <AOFImageAltFields fields={FIELDS} form={form} />
      <AOFImageAccessRow fields={FIELDS} form={form} {...COLOURS} />
      <AOFImageAppsRow
        fields={FIELDS}
        form={form}
        options={options}
        {...COLOURS}
      />
    </form>
  );
};

const show = (props: Parameters<typeof Harness>[0] = {}) =>
  renderInUi({ children: <Harness {...props} />, messages: {} });
/** The nav's own colour variables, as the chosen option's button inherits them. */
const coloursOf = (side: Pick<Locator, "element">) => {
  const style = getComputedStyle(side.element());
  return {
    ink: style.getPropertyValue("--gn-active-ink").trim(),
    pill: style.getPropertyValue("--gn-pill").trim(),
  };
};
const altField = (language: string) =>
  page.getByRole("textbox", { name: language });

describe("AOFImageAltFields", () => {
  it("shows English and Italian, with the text they hold", async () => {
    show();
    await expect.element(altField("English")).toHaveValue(ALT.en);
    await expect.element(altField("italiano")).toHaveValue(ALT.it);
  });

  it("adds a language from the picker and removes it again", async () => {
    show();
    await page
      .getByRole("combobox", { name: fieldsCopy("addLanguage") })
      .fill("French");
    await page.getByRole("option", { name: FRENCH }).click();
    await expect.element(altField("français")).toBeVisible();
    await page
      .getByRole("button", {
        name: fieldsCopy("removeLanguage", { language: "français" }),
      })
      .click();
    await expect.element(altField("français")).not.toBeInTheDocument();
  });

  it("clears a language's text from the button at its end, and keeps the caret in it", async () => {
    show();
    const clear = page.getByRole("button", {
      name: fieldsCopy("clearAlt", { language: "English" }),
    });
    await clear.click();
    await expect.element(altField("English")).toHaveValue("");
    await expect.element(altField("English")).toHaveFocus();
    await expect.element(clear).not.toBeInTheDocument();
    await expect.element(altField("italiano")).toHaveValue(ALT.it);
  });

  it("sets the remove button level with its input, the same height", async () => {
    show({ alt: { ...ALT, fr: "La mer" } });
    await expect.element(altField("français")).toBeVisible();
    const input = altField("français").element().getBoundingClientRect();
    const button = page
      .getByRole("button", {
        name: fieldsCopy("removeLanguage", { language: "français" }),
      })
      .element()
      .getBoundingClientRect();
    expect(button.top).toBeCloseTo(input.top, 0);
    expect(button.height).toBeCloseTo(input.height, 0);
  });

  it("does not offer a language the Image already holds", async () => {
    show({ alt: { ...ALT, fr: "La mer" } });
    await page
      .getByRole("combobox", { name: fieldsCopy("addLanguage") })
      .fill("French");
    await expect
      .element(page.getByRole("option", { name: FRENCH }))
      .not.toBeInTheDocument();
  });

  it("starts on the extra languages the Image holds, with their text", async () => {
    show({ alt: { ...ALT, fr: "La mer" } });
    await expect.element(altField("français")).toHaveValue("La mer");
  });

  it("keeps what was typed when another language is added", async () => {
    show();
    await altField("English").fill("Typed");
    await page
      .getByRole("combobox", { name: fieldsCopy("addLanguage") })
      .fill("German");
    await page.getByRole("option", { name: GERMAN }).click();
    await expect.element(altField("English")).toHaveValue("Typed");
  });
});

describe("AOFImageAppsRow", () => {
  it("offers only the Apps it is given, the Image's own switched on", async () => {
    show({ options: [OPTIONS[0]] });
    await expect
      .element(appIn(page, SHELL.name))
      .toHaveAttribute("aria-current", "page");
    await expect.element(appToggle(page, REEF.name)).not.toBeInTheDocument();
  });

  it("switches an App on and off", async () => {
    show();
    await appIn(page, REEF.name).click();
    await expect
      .element(appIn(page, REEF.name))
      .toHaveAttribute("aria-current", "page");
    await appToggle(page, REEF.name)
      .getByRole("button", { exact: true, name: fieldsCopy("appOut") })
      .click();
    await expect
      .element(appIn(page, REEF.name))
      .not.toHaveAttribute("aria-current");
  });

  it("paints the chosen option in the colours it is given", async () => {
    show();
    await expect
      .poll(() => coloursOf(appIn(page, SHELL.name)))
      .toEqual(COLOURS);
  });
});

describe("AOFImageAccessRow", () => {
  it("offers public and private", async () => {
    show();
    const row = page.getByRole("radiogroup", { name: fieldsCopy("access") });
    await expect
      .element(row.getByRole("button", { name: fieldsCopy("option.PUBLIC") }))
      .toBeVisible();
    await expect
      .element(row.getByRole("button", { name: fieldsCopy("option.PRIVATE") }))
      .toBeVisible();
  });

  it("paints the chosen option in the colours it is given", async () => {
    show();
    const row = page.getByRole("radiogroup", { name: fieldsCopy("access") });
    await expect
      .poll(() =>
        coloursOf(
          row.getByRole("button", { name: fieldsCopy("option.PRIVATE") })
        )
      )
      .toEqual(COLOURS);
  });
});
