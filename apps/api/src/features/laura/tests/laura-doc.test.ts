// @module-tag unit

import { HTTP } from "@allonfire/core/features/http/constants/http";
import { objectKeys } from "@allonfire/core/shared/utils/object";
import { LAURA } from "../constants/laura";

/** The one success status each Gallery route documents. */
const STATUS_OF_GALLERY_VERB = {
  GET: HTTP.STATUS.OK,
} as const satisfies Record<keyof typeof LAURA.GALLERY.DOC, number>;

/** The one success status each Favorites route documents. */
const STATUS_OF_FAVORITES_VERB = {
  DELETE: HTTP.STATUS.OK,
  GET: HTTP.STATUS.OK,
  PUT: HTTP.STATUS.OK,
} as const satisfies Record<keyof typeof LAURA.FAVORITES.DOC, number>;

/** The one success status each Memory route documents. */
const STATUS_OF_GAMES_VERB = {
  DECK: HTTP.STATUS.OK,
  LEADERBOARD: HTTP.STATUS.OK,
  SCORES: HTTP.STATUS.CREATED,
} as const satisfies Record<keyof typeof LAURA.GAMES.DOC, number>;

/** What a route's doc must say: its two texts and the status of its one response. */
const shapeOf = (
  doc: {
    DESCRIPTION: string;
    RESPONSE: Record<number, string>;
    SUMMARY: string;
  },
  status: number
) => ({
  description: doc.DESCRIPTION === "",
  statuses: objectKeys(doc.RESPONSE),
  summary: doc.SUMMARY === "",
  wanted: [String(status)],
});

const documented = (status: number) => ({
  description: false,
  statuses: [String(status)],
  summary: false,
  wanted: [String(status)],
});

describe("LAURA.GALLERY.DOC", () => {
  it("documents the Gallery route", () => {
    expect(objectKeys(LAURA.GALLERY.DOC)).toEqual(
      objectKeys(STATUS_OF_GALLERY_VERB)
    );
  });

  it.each(objectKeys(STATUS_OF_GALLERY_VERB))(
    "%s has a summary, a description and the response of its success status",
    (verb) => {
      expect(
        shapeOf(LAURA.GALLERY.DOC[verb], STATUS_OF_GALLERY_VERB[verb])
      ).toEqual(documented(STATUS_OF_GALLERY_VERB[verb]));
    }
  );
});

describe("LAURA.FAVORITES.DOC", () => {
  it("documents the three Favorites routes, in order", () => {
    expect(objectKeys(LAURA.FAVORITES.DOC)).toEqual(
      objectKeys(STATUS_OF_FAVORITES_VERB)
    );
  });

  it.each(objectKeys(STATUS_OF_FAVORITES_VERB))(
    "%s has a summary, a description and the response of its success status",
    (verb) => {
      expect(
        shapeOf(LAURA.FAVORITES.DOC[verb], STATUS_OF_FAVORITES_VERB[verb])
      ).toEqual(documented(STATUS_OF_FAVORITES_VERB[verb]));
    }
  );
});

describe("LAURA.GAMES.DOC", () => {
  it("documents the three Memory routes, in order", () => {
    expect(objectKeys(LAURA.GAMES.DOC)).toEqual(
      objectKeys(STATUS_OF_GAMES_VERB)
    );
  });

  it.each(objectKeys(STATUS_OF_GAMES_VERB))(
    "%s has a summary, a description and the response of its success status",
    (verb) => {
      expect(
        shapeOf(LAURA.GAMES.DOC[verb], STATUS_OF_GAMES_VERB[verb])
      ).toEqual(documented(STATUS_OF_GAMES_VERB[verb]));
    }
  );

  it("lists as many players as the leaderboard limit says", () => {
    expect(LAURA.GAMES.DOC.LEADERBOARD.DESCRIPTION).toContain(
      `the top ${LAURA.GAMES.LIMIT.LEADERBOARD_TOP}`
    );
  });
});
