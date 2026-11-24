import { heightAtIn } from "@allonfire/ui/shared/tests/height-at";
import type { ReactNode } from "react";
import EN from "../../features/i18n/translations/en.json" with { type: "json" };

/** The page's body, `width` wide inside the container the Section gives it, as `view` draws it (the Back Office's words). */
export const heightAt = (width: number, view: ReactNode) =>
  heightAtIn({ messages: EN, view, width });
