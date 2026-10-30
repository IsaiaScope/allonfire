import type { ComponentProps, ElementType } from "react";

/**
 * Every prop of an element or component except `children`, for a component
 * that renders its own content (an icon button, a seal, a board) and passes
 * the rest through. React 19 ships no such helper: `ComponentProps` already
 * carries `ref` as a plain prop, so the `...WithRef`/`...WithoutRef` pair is
 * obsolete and `Omit` covers the one prop left out.
 */
export type ComponentPropsWithoutChildren<T extends ElementType> = Omit<
  ComponentProps<T>,
  "children"
>;
