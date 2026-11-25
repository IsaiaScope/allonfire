// @module-tag unit
import { aofMessages } from "@allonfire/core/features/next/i18n/utils/aof-translators";
import { objectEntries } from "@allonfire/core/shared/utils/object";
import { BRAND } from "@allonfire/design/brand/aof-monogram";
import { translationsSuite } from "@allonfire/ui/shared/tests/translations-suite";
import EN from "@/features/i18n/translations/en.json" with { type: "json" };
import IT from "@/features/i18n/translations/it.json" with { type: "json" };
import { LAURA } from "@/shared/constants/laura";
import { enT, itT } from "@/shared/tests/translators";

/** Every message a toast shows (`aofToast`), by its key. A new toast's key goes in this list. */
const TOAST_KEYS = ["Upload.added"] as const;

translationsSuite({
  en: aofMessages("en", EN),
  it: aofMessages("it", IT),
  names: [LAURA.name, BRAND.NAME, LAURA.shareImageAlt],
  sample: { count: 2 },
  toastKeys: TOAST_KEYS,
  translate: (locale, key) => (locale === "en" ? enT : itT)(key),
});

describe("Laura translations", () => {
  it("describes the App in both languages", () => {
    expect(EN.Metadata.description).toBeTruthy();
    expect(IT.Metadata.description).toBeTruthy();
  });
});

type Tree = { [key: string]: string | Tree };

/** Every message of a tree as `[dotted path, text]`. */
const messages = (tree: Tree, prefix = ""): [string, string][] =>
  objectEntries(tree).flatMap(([key, value]) =>
    typeof value === "string"
      ? [[`${prefix}${key}`, value] satisfies [string, string]]
      : messages(value, `${prefix}${key}.`)
  );

/** The Gallery's and the Favorites' words, one list per language. */
const copy = (tree: { Favorites: Tree; Gallery: Tree }) => [
  ...messages(tree.Gallery, "Gallery."),
  ...messages(tree.Favorites, "Favorites."),
];

/** Words the glossary rules out for a Favorite in running copy (`CONTEXT.md`, Favorite: _Avoid_). */
const AVOIDED_FOR_FAVORITE =
  /\b(like[sd]?|bookmark(?:s|ed)?|starred|stars?)\b/i;

const FAVORITE_EN = /favorite/i;
const FAVORITE_IT = /preferit/i;

describe("the Gallery's and the Favorites' copy", () => {
  it("holds the same keys in both languages", () => {
    expect(copy(IT).map(([path]) => path)).toEqual(
      copy(EN).map(([path]) => path)
    );
  });

  it("leaves no message empty", () => {
    for (const [path, text] of [...copy(EN), ...copy(IT)]) {
      expect(text.trim(), path).not.toBe("");
    }
  });

  it("gives the position's words their {index} and {total} in both languages", () => {
    for (const { position } of [EN.Gallery.preview, IT.Gallery.preview]) {
      expect(position).toContain("{index}");
      expect(position).toContain("{total}");
    }
  });

  it("never calls a Favorite a like, a star or a bookmark in English", () => {
    for (const [path, text] of copy(EN)) {
      expect(text, path).not.toMatch(AVOIDED_FOR_FAVORITE);
    }
  });

  it("names the Favorite in the control's words, never only its heart", () => {
    expect(EN.Gallery.favorite.add).toMatch(FAVORITE_EN);
    expect(EN.Gallery.favorite.remove).toMatch(FAVORITE_EN);
    expect(EN.Gallery.favorite.toggle).toMatch(FAVORITE_EN);
    expect(IT.Gallery.favorite.add).toMatch(FAVORITE_IT);
    expect(IT.Gallery.favorite.remove).toMatch(FAVORITE_IT);
    expect(IT.Gallery.favorite.toggle).toMatch(FAVORITE_IT);
  });
});
