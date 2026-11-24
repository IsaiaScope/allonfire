"use client";

import { HTTP } from "@allonfire/core/features/http/constants/http";
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import type { Sidebar } from "@allonfire/shadcn/components/sidebar";
import { useSidebar } from "@allonfire/shadcn/components/sidebar";
import type { ComponentProps, ReactNode } from "react";

export type Collapsible = NonNullable<
  ComponentProps<typeof Sidebar>["collapsible"]
>;

/** The address param that holds the sidebar's state, and its collapsed value. */
export type AOFSidebarCollapsedBy = { param: string; value: string };

/**
 * Runs while the HTML is parsed, before the first paint: when the address
 * holds the collapsed value, the wrapper right before it says so.
 */
const collapseOnArrival = (
  { param, value }: AOFSidebarCollapsedBy,
  collapsible: Collapsible
) => `{
  const wrapper = document.currentScript.previousElementSibling;
  if (new URLSearchParams(location.search).get(${stringifyJson(param)}) === ${stringifyJson(value)}) {
    wrapper.dataset.state = "collapsed";
    wrapper.dataset.collapsible = ${stringifyJson(collapsible)};
  }
}`;

/**
 * Draws the sidebar collapsed from the first paint (Next's "Preventing flash
 * before hydration"). A prerendered page's HTML is the sidebar open, and the
 * App reads its address only once the page runs: alone, the menu would show
 * open, then close. This wrapper carries shadcn's own marks (`group`,
 * `data-state`, `data-collapsible`), which every `group-data-*` class inside
 * the sidebar reads from any ancestor; the inline script sets them before
 * the first paint, and after that they follow the sidebar's state, so the
 * hydration mismatch is the script's, expected. React never runs a script it
 * renders in the browser, so there the script is inert.
 */
export const CollapsedOnArrival = ({
  by,
  children,
  collapsible,
}: {
  by: AOFSidebarCollapsedBy;
  children: ReactNode;
  collapsible: Collapsible;
}) => {
  const { state } = useSidebar();
  return (
    <>
      <div
        className="group contents"
        data-collapsible={state === "collapsed" ? collapsible : ""}
        data-state={state}
        suppressHydrationWarning
      >
        {children}
      </div>
      <script
        suppressHydrationWarning
        type={
          typeof window === "undefined" ? undefined : HTTP.CONTENT_TYPE.JSON
        }
      >
        {collapseOnArrival(by, collapsible)}
      </script>
    </>
  );
};
