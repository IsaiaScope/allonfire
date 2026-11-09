/**
 * The kanji brushed in an action that means the same wherever it is (a
 * `kanjiAction`'s `ActionKanji`), one per meaning, decoration only (the
 * Japan Design's brush face carries each). An action that is its page's own
 * (Delete's 消, Save's 済) keeps its kanji in its feature.
 */
export const ACTION_KANJI = {
  /** 戻, return: brushed in a button or link that leads back to a page. */
  BACK: "戻",
  /** 戻, to go back: brushed in Cancel, which leaves without doing it. */
  CANCEL: "戻",
  /** 再, again: brushed in a button that retries or reloads. */
  RETRY: "再",
} as const;
