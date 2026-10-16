"use client";

import { ThemeProvider, type ThemeProviderProps } from "next-themes";
import { HTTP } from "../../http/constants/http";

/**
 * next-themes' inline script sets the theme from the server's HTML, before
 * the first paint. A client render of the layout (Next does one for a 404 in
 * dev) meets it again, and React 19 refuses to run a script it renders: it
 * warns. In the browser the script has already run, so it is rendered inert
 * there, beside any `scriptProps` the App passes; the type mismatch is
 * covered by the script's own suppressHydrationWarning.
 */
const inertInBrowser = (scriptProps: ThemeProviderProps["scriptProps"]) =>
  typeof window === "undefined"
    ? {}
    : { scriptProps: { ...scriptProps, type: HTTP.CONTENT_TYPE.JSON } };

/** Follows the OS through the `.dark` class every Design's theme.css targets. */
export const AOFThemeProvider = (props: ThemeProviderProps) => (
  <ThemeProvider
    attribute="class"
    defaultTheme="system"
    disableTransitionOnChange
    enableSystem
    {...props}
    {...inertInBrowser(props.scriptProps)}
  />
);
