/**
 * Watches the page for any of `words` showing, even for a moment: a notice
 * that flashes and goes is gone before an assertion could see it. `seen()`
 * stops the watching and answers which of the words showed.
 */
export const watchWarnings = (words: readonly string[]) => {
  const seen = new Set<string>();
  const look = () => {
    for (const word of words) {
      if (document.body.textContent?.includes(word)) {
        seen.add(word);
      }
    }
  };
  const observer = new MutationObserver(look);
  observer.observe(document.body, {
    characterData: true,
    childList: true,
    subtree: true,
  });
  return {
    seen: () => {
      look();
      observer.disconnect();
      return [...seen];
    },
  };
};
