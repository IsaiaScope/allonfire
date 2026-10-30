"use client";

import { useEffect } from "react";

/**
 * A special page's tab title (not found, an error: neither takes metadata),
 * set while the page shows. Never a `<title>` element: a page left is
 * hidden in React's `<Activity>`, not unmounted, so a hoisted one stays in
 * the head (leaving the 404 for Home kept "Page not found" on the tab), and
 * back on the page it sits behind Next's own. Hiding runs the cleanup,
 * which gives the tab back unless the next page has named it already.
 */
export const NoticeTitle = ({ children }: { children: string }) => {
  useEffect(() => {
    const before = document.title;
    document.title = children;
    return () => {
      if (document.title === children) {
        document.title = before;
      }
    };
  }, [children]);
  return null;
};
