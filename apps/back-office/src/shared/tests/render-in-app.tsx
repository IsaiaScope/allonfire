import { DATE } from "@allonfire/core/features/i18n/constants/dates";
import {
  I18N,
  type Language,
} from "@allonfire/core/features/i18n/constants/locales";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { aofMessages } from "@allonfire/core/features/next/i18n/utils/aof-translators";
import { aofErrorCaches } from "@allonfire/core/features/next/query/utils/aof-query-errors";
import { AOFToaster } from "@allonfire/ui/features/feedback/components/aof-toaster";
import { aofNotifyError } from "@allonfire/ui/features/query/components/aof-query-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { NuqsTestingAdapter, type UrlUpdateEvent } from "nuqs/adapters/testing";
import type { ReactNode } from "react";
import { render } from "vitest-browser-react";
import EN from "../../features/i18n/translations/en.json" with { type: "json" };

/**
 * `children` as the App renders a page body in a browser test: the query
 * client with its error caches (no retry), the address `search` the URL
 * state reads (each change sent to `onUrlUpdate`), the words of a `language`
 * over core's shared ones, and the toaster.
 */
export const renderInApp = ({
  children,
  language = I18N.DEFAULT_LANGUAGE,
  messages = EN,
  onUrlUpdate = vi.fn(),
  search = "",
}: {
  children: ReactNode;
  language?: Language;
  messages?: typeof EN;
  onUrlUpdate?: (event: UrlUpdateEvent) => void;
  search?: string;
}) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          ...aofErrorCaches({
            fallback: SHARED_TRANSLATIONS.en.Common.Request.failed,
            notify: aofNotifyError,
          }),
          defaultOptions: { queries: { retry: false } },
        })
      }
    >
      <NuqsTestingAdapter
        hasMemory
        onUrlUpdate={onUrlUpdate}
        searchParams={search}
      >
        <NextIntlClientProvider
          formats={DATE.FORMATS}
          locale={language}
          messages={aofMessages(language, messages)}
          timeZone={DATE.TIME_ZONE}
        >
          {children}
          <AOFToaster />
        </NextIntlClientProvider>
      </NuqsTestingAdapter>
    </QueryClientProvider>
  );
