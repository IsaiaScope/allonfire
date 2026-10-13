"use client";

import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/shared-translations";

// Outside `[locale]` and replacing the root layout, so no locale is known and
// no next-intl provider runs: the shared text, in the default language.
const { Error: TEXT } = SHARED_TRANSLATIONS[I18N.DEFAULT_LANGUAGE].Common;

const GlobalError = ({ retry }: { retry: () => void }) => (
  <html lang={I18N.DEFAULT_LANGUAGE}>
    <body>
      <main>
        <h1>{TEXT.title}</h1>
        <button onClick={retry} type="button">
          {TEXT.retry}
        </button>
      </main>
    </body>
  </html>
);

export default GlobalError;
