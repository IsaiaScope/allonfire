/**
 * What a browser test reads from the toast Sonner draws around a custom card
 * or a notice: the Install hint's tests and the toasters' tests of each App
 * ask the same two questions.
 */

/** The `-webkit-line-clamp` of the notice's words (Sonner's title element). */
export const noticeLineClamp = () => {
  const title = document.querySelector("[data-sonner-toast] [data-title]");
  if (!title) {
    throw new Error("The notice has no title element");
  }
  return getComputedStyle(title).webkitLineClamp;
};

/**
 * The heights of the toast and of the card inside it: Sonner wraps a custom
 * toast's card in its title element, and a line clamp on that element cut the
 * card short in WebKit (iOS Safari), its steps lost. The toast must stand at
 * least as tall as its card. No card gives infinity, so the check fails.
 */
export const toastAndCardHeights = () => {
  const card = document.querySelector("aside");
  const toast = document.querySelector("[data-sonner-toast]");
  return {
    card: card?.getBoundingClientRect().height ?? Number.POSITIVE_INFINITY,
    toast: toast?.getBoundingClientRect().height ?? 0,
  };
};
