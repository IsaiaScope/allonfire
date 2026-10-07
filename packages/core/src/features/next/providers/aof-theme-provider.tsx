"use client";

import { ThemeProvider, type ThemeProviderProps } from "next-themes";

/** Follows the OS through the `.dark` class every Design's theme.css targets. */
export const AOFThemeProvider = (props: ThemeProviderProps) => (
  <ThemeProvider
    attribute="class"
    defaultTheme="system"
    disableTransitionOnChange
    enableSystem
    {...props}
  />
);
