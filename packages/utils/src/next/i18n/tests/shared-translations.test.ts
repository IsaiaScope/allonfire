// @module-tag unit
import { readdirSync, readFileSync } from "node:fs";
import { z } from "zod";
import { LANGUAGES } from "../../../constants/locales";
import { APPS, scaffoldedApps } from "../../tests/scaffolded-apps";
import { SHARED_TRANSLATIONS } from "../shared-translations";

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

describe("shared translations", () => {
  it.each(LANGUAGES)("%s has the Common namespace", (language) => {
    expect(SHARED_TRANSLATIONS[language]).toHaveProperty(SHARED_NAMESPACE);
  });

  it.each(appTranslations)("%s leaves Common to utils", (_, file) => {
    const translations = translationsSchema.parse(
      JSON.parse(readFileSync(file, "utf8"))
    );
    expect(translations).not.toHaveProperty(SHARED_NAMESPACE);
  });
});
