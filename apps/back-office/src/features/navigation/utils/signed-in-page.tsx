import { withAppSession } from "@allonfire/auth/features/next/components/with-app-session";
import type { ComponentType } from "react";
import { SectionLoading } from "../components/section-loading";

/**
 * Every signed-in page's default export: `withAppSession` with the Back
 * Office's loading screen as what the page area shows while the Session
 * check waits.
 */
export const signedInPage = <Props extends object>(
  Page: ComponentType<Props>
) => withAppSession(Page, <SectionLoading />);
