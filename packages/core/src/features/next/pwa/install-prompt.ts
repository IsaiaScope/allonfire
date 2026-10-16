/**
 * Chrome's `beforeinstallprompt` (Chrome, Edge, Android; not in the DOM
 * types): the browser's own install dialog, held for the Install button.
 */
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

const isInstallPrompt = (event: Event): event is InstallPromptEvent =>
  "prompt" in event && "userChoice" in event;

let held: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => {
  for (const listener of listeners) {
    listener();
  }
};

// Listening starts when this module loads, before React hydrates: Chrome
// fires the event once, often before any component mounts.
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    if (!isInstallPrompt(event)) {
      return;
    }
    // Holds back Android's mini-infobar: the Install hint offers it instead.
    event.preventDefault();
    held = event;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    held = null;
    notify();
  });
}

/** The browser's held install prompt, or null: `useSyncExternalStore`'s read. */
export const installPrompt = () => held;

/** Tells `listener` when the held prompt changes; returns the unsubscribe. */
export const subscribeInstallPrompt = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
