// @module-tag integration
import { DATE } from "@allonfire/core/features/i18n/constants/dates";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { renderHook } from "vitest-browser-react";
import { useDayFormat } from "../hooks/use-day-format";

const wrapper = ({ children }: { children: ReactNode }) => (
  <NextIntlClientProvider
    formats={DATE.FORMAT.INTL}
    locale="en"
    timeZone={DATE.TIME_ZONE}
  >
    {children}
  </NextIntlClientProvider>
);

describe("useDayFormat", () => {
  it("writes the day it names, in the app's zone, whatever the browser's zone", async () => {
    const { result } = await renderHook(() => useDayFormat(), { wrapper });
    expect(result.current("2026-11-26")).toBe("Nov 26, 2026");
    expect(result.current("2026-01-01")).toBe("Jan 1, 2026");
  });
});
