/** What `reloadOnResume` needs of `document`. */
type ResumablePage = {
  addEventListener: (type: "visibilitychange", listener: () => void) => void;
  removeEventListener: (type: "visibilitychange", listener: () => void) => void;
  visibilityState: string;
};

/**
 * Reloads the page when it becomes visible after being hidden for more than
 * `hiddenMs`. Answers how to stop listening.
 * @internal
 */
export const reloadOnResume = ({
  hiddenMs,
  now,
  page,
  reload,
}: {
  hiddenMs: number;
  now: () => number;
  page: ResumablePage;
  reload: () => void;
}) => {
  let hiddenAt: number | null = null;
  const onChange = () => {
    if (page.visibilityState === "hidden") {
      hiddenAt = now();
      return;
    }
    if (hiddenAt !== null && now() - hiddenAt > hiddenMs) {
      reload();
    }
    hiddenAt = null;
  };
  page.addEventListener("visibilitychange", onChange);
  return () => page.removeEventListener("visibilitychange", onChange);
};
