// @module-tag unit
import { objectValues } from "@allonfire/core/shared/utils/object";
import { BRAND } from "@allonfire/design/brand/aof-monogram";
import EN from "@/features/i18n/translations/en.json" with { type: "json" };
import IT from "@/features/i18n/translations/it.json" with { type: "json" };
import { BACK_OFFICE } from "@/shared/constants/back-office";

type Tree = { [key: string]: string | Tree };

const strings = (tree: Tree): string[] =>
  objectValues(tree).flatMap((value) =>
    typeof value === "string" ? [value] : strings(value)
  );

const NAMES: readonly string[] = [
  BACK_OFFICE.NAME,
  BRAND.NAME,
  BACK_OFFICE.SHARE_IMAGE_ALT,
];

describe("translations", () => {
  // A name is the same in every language: it comes from its constant, so
  // renaming the App or the brand is one change, never one per language.
  it.each([
    ["en", EN],
    ["it", IT],
  ])("%s holds no entry that is only a name", (_, translations) => {
    expect(
      strings(translations).filter((text) => NAMES.includes(text))
    ).toEqual([]);
  });
});
