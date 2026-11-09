"use client";

import { Fragment, type ReactNode, useLayoutEffect, useState } from "react";

/**
 * Its children start over each time their page comes back. With Cache
 * Components a page left is hidden in React's `<Activity>`, not unmounted,
 * so a form keeps what was typed, an action's last answer and a password in
 * the hidden page; a form that adds something should open empty instead.
 * Hiding runs effect cleanups, so the cleanup moves to a new key and React
 * remounts the children: every hook's state and the DOM start over. A layout
 * effect, so the reset is done before the page shows again. Next's guide
 * "Preserving UI state" (`preserving-ui-state.md`, Forms) names this case, a
 * "new item" form that starts fresh, and both halves are its own: a reset in
 * a `useLayoutEffect` cleanup, and a `key` that remounts what it holds.
 */
export const AOFFreshOnReturn = ({ children }: { children: ReactNode }) => {
  const [visit, setVisit] = useState(0);
  useLayoutEffect(() => () => setVisit((count) => count + 1), []);
  return <Fragment key={visit}>{children}</Fragment>;
};
