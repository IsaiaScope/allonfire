"use client";

import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { useTheme } from "next-themes";
import { useCallback } from "react";

const { DARK, LIGHT } = METADATA.COLOR_SCHEME;

/**
 * Flips between light and dark through next-themes: what AOFThemeToggle and
 * any menu item switching the theme call on click.
 */
export const useAOFThemeSwitch = () => {
  const { resolvedTheme, setTheme } = useTheme();
  return useCallback(
    () => setTheme(resolvedTheme === DARK ? LIGHT : DARK),
    [resolvedTheme, setTheme]
  );
};
