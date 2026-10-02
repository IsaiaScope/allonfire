import { AOFDefineRouting } from "../aof-define-routing";

// The default locale is one of LANGUAGES.
// @ts-expect-error "de" is not a Language
AOFDefineRouting({ defaultLocale: "de" });

// Every App routes the shared LANGUAGES; locales are not an option.
// @ts-expect-error locales come from LANGUAGES
AOFDefineRouting({ locales: ["en"] });
