import {
  I18N,
  type Language,
  languageSchema,
} from "@allonfire/core/features/i18n/constants/locales";
import { enUS } from "react-day-picker/locale/en-US";
import { it } from "react-day-picker/locale/it";

/** The calendar's months, weekdays, week start and spoken labels for each language the Apps speak. */
const CALENDAR_LOCALE = {
  en: enUS,
  it,
} as const satisfies Record<Language, typeof enUS>;

/** The calendar's words for the page's language (`useLocale()` in a Next App); the default language's for one it does not know. */
export const calendarLocaleOf = (language: string | undefined) => {
  const parsed = languageSchema.safeParse(language);
  return CALENDAR_LOCALE[parsed.success ? parsed.data : I18N.DEFAULT_LANGUAGE];
};
