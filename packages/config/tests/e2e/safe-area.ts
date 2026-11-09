import { globSync } from "node:fs";
import { sep } from "node:path";
import type { Page } from "@playwright/test";

/**
 * The safe-area guard every App's e2e runs (`e2e/safe-area.spec.ts`): its
 * pages, found from its `src/app`, drawn on a notched phone held upright,
 * turned sideways and turned after loading, keep every text run and control
 * inside the safe area. Only Chromium can draw a notch.
 */

export type SafeAreaInsets = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

export const SAFE_AREA = {
  /** An iPhone's insets: the Dynamic Island and home indicator upright; the
   *  sensor housing on one side and the indicator below, sideways (iOS
   *  reports the housing's width on both sides). */
  INSETS: {
    SIDEWAYS: { bottom: 21, left: 59, right: 59, top: 0 },
    UPRIGHT: { bottom: 34, left: 0, right: 0, top: 59 },
  },
} as const satisfies { INSETS: Record<string, SafeAreaInsets> };

/** Draws `insets` on the screen, as a notched phone does. */
export const notch = async (page: Page, insets: SafeAreaInsets) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setSafeAreaInsetsOverride", { insets });
};

/** A route group's folder, `(signed-in)`. */
const GROUP = /^\((.+)\)$/;
const PAGE_FILE = /page\.tsx$/;

/**
 * Every page an App Router serves, from its `app` folder: the address
 * pattern with its params kept (`/[locale]/users/[id]`) and the route
 * groups it sits in, apart.
 */
export const appRoutes = (appDir: string) =>
  globSync("**/page.tsx", { cwd: appDir, exclude: ["**/._*"] })
    .map((file) => {
      const folders = file.replace(PAGE_FILE, "").split(sep).filter(Boolean);
      return {
        groups: folders
          .filter((folder) => GROUP.test(folder))
          .map((folder) => folder.slice(1, -1)),
        path: `/${folders.filter((folder) => !GROUP.test(folder)).join("/")}`,
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));

/**
 * What reaches past the safe area: every text run and control on screen,
 * cut to what its scrollers show. Left and right hold everywhere; top and
 * bottom for what is pinned (fixed or sticky), and the top for the rest at
 * the page's start, since content scrolls under the bars by design.
 */
export const outsideSafeArea = (page: Page, insets: SafeAreaInsets) =>
  page.evaluate((safe) => {
    const CONTROLS =
      "a[href], button, input, select, textarea, [role=button], [role=link], [role=menuitem], [role=tab]";
    const width = document.documentElement.clientWidth;
    const height = window.innerHeight;
    const hidden = (element: Element) =>
      element.closest("[aria-hidden=true], [inert]") !== null ||
      element.checkVisibility({
        opacityProperty: true,
        visibilityProperty: true,
      }) === false;
    const pinned = (element: Element | null): boolean => {
      for (let at = element; at; at = at.parentElement) {
        const { position } = getComputedStyle(at);
        if (position === "fixed" || position === "sticky") {
          return true;
        }
      }
      return false;
    };
    /** `rect` cut by `clip` and every scroller and clip around it. */
    const shown = (clip: Element | null, rect: DOMRect) => {
      let { bottom, left, right, top } = rect;
      for (let at = clip; at; at = at.parentElement) {
        const style = getComputedStyle(at);
        if (style.overflowX !== "visible" || style.overflowY !== "visible") {
          const box = at.getBoundingClientRect();
          left = Math.max(left, box.left);
          right = Math.min(right, box.right);
          top = Math.max(top, box.top);
          bottom = Math.min(bottom, box.bottom);
        }
      }
      left = Math.max(left, 0);
      right = Math.min(right, width);
      top = Math.max(top, 0);
      bottom = Math.min(bottom, height);
      // A screen-reader-only label is 1px: nothing anyone sees.
      return right - left > 1 && bottom - top > 1
        ? { bottom, left, right, top }
        : undefined;
    };
    /** A text run is cut by its own element too (a screen-reader-only
     *  label's text overflows its 1px box); a control from its parent. */
    const parts: {
      clip: Element | null;
      element: Element;
      label: string;
      rect: DOMRect;
    }[] = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT
    );
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const label = node.textContent?.trim() ?? "";
      const element = node.parentElement;
      if (label && element) {
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const rect of range.getClientRects()) {
          parts.push({ clip: element, element, label, rect });
        }
      }
    }
    for (const element of document.querySelectorAll(CONTROLS)) {
      parts.push({
        clip: element.parentElement,
        element,
        label: `<${element.tagName.toLowerCase()}> ${element.getAttribute("aria-label") ?? element.textContent?.trim() ?? ""}`,
        rect: element.getBoundingClientRect(),
      });
    }
    const atStart = window.scrollY === 0;
    return parts.flatMap(({ clip, element, label, rect }) => {
      if (hidden(element)) {
        return [];
      }
      const seen = shown(clip, rect);
      if (!seen) {
        return [];
      }
      const fixed = pinned(element);
      const sides = [
        seen.left < safe.left && "left",
        seen.right > width - safe.right && "right",
        (fixed || atStart) && seen.top < safe.top && "top",
        fixed && seen.bottom > height - safe.bottom && "bottom",
      ].filter(Boolean);
      return sides.length ? [`${sides.join("+")}: ${label.slice(0, 60)}`] : [];
    });
  }, insets);
