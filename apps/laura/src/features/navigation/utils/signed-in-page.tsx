import {
  type AppSessionOptions,
  withAppSession,
} from "@allonfire/auth/features/next/components/with-app-session";
import type { ComponentType } from "react";
import { SectionLoading } from "../components/section-loading";

/**
 * Every signed-in page's default export: `withAppSession` with Laura's
 * loading screen as what the page area shows while the Session check waits.
 * `options.minRole` is a Section above the App's floor's own.
 */
// jscpd:ignore-start
// `withAppSession` already takes the App's own loading screen as an argument, so a shared factory would only rename it; the Back Office's twin differs in that screen alone.
export const signedInPage = <Props extends object>(
  Page: ComponentType<Props>,
  options?: AppSessionOptions
) => withAppSession(Page, <SectionLoading />, options);
// jscpd:ignore-end
