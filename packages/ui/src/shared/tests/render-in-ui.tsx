import { DATE } from "@allonfire/core/features/i18n/constants/dates";
import {
  I18N,
  type Language,
} from "@allonfire/core/features/i18n/constants/locales";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { aofMessages } from "@allonfire/core/features/next/i18n/utils/aof-translators";
import { aofErrorCaches } from "@allonfire/core/features/next/query/utils/aof-query-errors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { NuqsTestingAdapter, type UrlUpdateEvent } from "nuqs/adapters/testing";
import type { ReactNode } from "react";
import { render } from "vitest-browser-react";
import { AOFToaster } from "../../features/feedback/components/aof-toaster";
import { aofNotifyError } from "../../features/query/components/aof-query-provider";

/**
 * `children` as an App renders a page body in a browser test: the query
 * client with its error caches (no retry), the address `search` the URL
 * state reads (each change sent to `onUrlUpdate`), the words of a `language`
 * (the App's `messages` over core's shared ones), and the toaster. An App
 * binds its own copy once (`renderInApp`).
 */
export const renderInUi = ({
  children,
  language = I18N.DEFAULT_LANGUAGE,
  messages,
  onUrlUpdate = vi.fn(),
  search = "",
}: {
  children: ReactNode;
  language?: Language;
  messages: object;
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
          // No retries unless a query asks for them, and then at once: a test
          // never waits on TanStack's own clock (1s before the first retry).
          defaultOptions: { queries: { retry: false, retryDelay: 0 } },
        })
      }
    >
      <NuqsTestingAdapter
        hasMemory
        onUrlUpdate={onUrlUpdate}
        searchParams={search}
      >
        <NextIntlClientProvider
          formats={DATE.FORMAT.INTL}
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

/**
 * `renderInUi` over an App's own words, bound once (`renderInApp`): the words
 * are the default `messages`, and a call can swap them.
 */
export const bindRenderInUi =
  <Messages extends object>(own: Messages) =>
  ({
    messages = own,
    ...options
  }: Omit<Parameters<typeof renderInUi>[0], "messages"> & {
    messages?: Messages;
  }) =>
    renderInUi({ messages, ...options });
