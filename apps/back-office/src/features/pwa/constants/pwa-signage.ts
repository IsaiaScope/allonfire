/** The Japan Design's signage on the PWA's pieces. */
export const PWA_SIGNAGE = {
  /** 導入 (dōnyū, installation): the Install hint's mark, in the line's colour. */
  INSTALL_KANJI: "導入",
  /** The Offline page and the offline pill (not an error: the network's). */
  OFFLINE: {
    /** The eki stamp's figure: 断, cut. */
    CODE: "断",
    /** 不通, line cut: what a board shows when a line is severed. */
    KANA: "不通",
    /** 再, again: brushed in the button that reloads. */
    RETRY_KANJI: "再",
    /** 圏外, out of range: what a phone shows with no signal, brushed huge. */
    WALL_KANJI: "圏外",
  },
} as const;
