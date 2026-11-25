// @module-tag unit

import { readdirSync, readFileSync } from "node:fs";
import { z } from "zod";
import { parseJsonWith } from "../../../../shared/utils/json";
import { objectEntries } from "../../../../shared/utils/object";
import { I18N } from "../../../i18n/constants/locales";
import { APPS, scaffoldedApps } from "../../tests/scaffolded-apps";
import { SHARED_TRANSLATIONS } from "../translations/shared-translations";

// `Common` is reserved for the shared translations: an App's own namespace of that
// name would silently replace them in the merge.
const SHARED_NAMESPACE = "Common";
const translationsSchema = z.record(z.string(), z.unknown());

const appTranslations = scaffoldedApps().flatMap((app) => {
  const dir = new URL(`${app}/src/features/i18n/translations/`, APPS);
  return readdirSync(dir)
    .filter((file) => file.endsWith(".json") && !file.startsWith("."))
    .map((file) => [`${app}/${file}`, new URL(file, dir)] as const);
});

/** Every key of a tree as a dotted path, so two languages' trees compare by their keys only. */
const pathsOf = (tree: object, prefix = ""): string[] =>
  objectEntries(tree).flatMap(([key, value]) =>
    typeof value === "object" && value !== null
      ? pathsOf(value, `${prefix}${key}.`)
      : [`${prefix}${key}`]
  );

/** The namespaces every App's Image forms read. */
const IMAGE_NAMESPACES = ["ImageFields", "ImageUpload"] as const;

describe("shared translations", () => {
  it.each(I18N.BASE_LANGUAGES)("%s has the Common namespace", (language) => {
    expect(SHARED_TRANSLATIONS[language]).toHaveProperty(SHARED_NAMESPACE);
  });

  it.each(appTranslations)("%s leaves Common to core", (_, file) => {
    const translations = parseJsonWith(
      readFileSync(file, "utf8"),
      translationsSchema
    );
    expect(translations).not.toHaveProperty(SHARED_NAMESPACE);
  });

  it.each(IMAGE_NAMESPACES)(
    "holds the same %s keys in every language",
    (namespace) => {
      const [first, ...others] = I18N.BASE_LANGUAGES.map((language) =>
        pathsOf(SHARED_TRANSLATIONS[language].Common[namespace]).sort((a, b) =>
          a.localeCompare(b)
        )
      );
      expect(first).not.toEqual([]);
      for (const paths of others) {
        expect(paths).toEqual(first);
      }
    }
  );
});
