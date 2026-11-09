/**
 * What the error pages print that is not translated: the station's own
 * signage, hidden from assistive tech, which reads the page's heading and
 * button instead.
 */
export const ERROR_SIGNAGE = {
  ERROR: {
    /** The eki stamp's figure: 停, stop. */
    CODE: "停",
    /** 見合わせ, suspended: what a board shows when a line has stopped. */
    KANA: "見合わせ",
    /** 運休, service suspended: brushed huge across the wall. */
    WALL_KANJI: "運休",
  },
  NOT_FOUND: {
    /** The eki stamp's figure: a station the line does not have. */
    CODE: "404",
    /** 回送, not in service: a train that takes no passengers. */
    KANA: "回送",
    /** 迷子, lost: brushed huge across the wall behind the page. */
    WALL_KANJI: "迷子",
  },
} as const;
