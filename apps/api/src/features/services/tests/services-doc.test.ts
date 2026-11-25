// @module-tag unit

import { HTTP } from "@allonfire/core/features/http/constants/http";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { objectKeys } from "@allonfire/core/shared/utils/object";
import { SERVICES } from "../constants/services";

/** Some text, not an empty string. */
const WORDS = /\S/;

/** The one success status each Services route documents. */
const STATUS_OF_VERB = {
  KEEP_ALIVE: HTTP.STATUS.OK,
  LIST: HTTP.STATUS.OK,
  PROVIDER: HTTP.STATUS.OK,
  SERVICE: HTTP.STATUS.OK,
  TEST: HTTP.STATUS.OK,
} as const satisfies Record<keyof typeof SERVICES.DOC, number>;

describe("SERVICES.DOC", () => {
  it("documents the five Services routes, in order", () => {
    expect(objectKeys(SERVICES.DOC)).toEqual(objectKeys(STATUS_OF_VERB));
  });

  it.each(objectKeys(STATUS_OF_VERB))(
    "%s has a summary, a description and the response of its success status",
    (verb) => {
      expect(SERVICES.DOC[verb]).toEqual({
        DESCRIPTION: expect.stringMatching(WORDS),
        RESPONSE: { [STATUS_OF_VERB[verb]]: expect.stringMatching(WORDS) },
        SUMMARY: expect.stringMatching(WORDS),
      });
    }
  );

  it("reads the idle days in the keep-alive text from the limit that enforces them", () => {
    expect(SERVICES.DOC.KEEP_ALIVE.DESCRIPTION).toContain(
      `in ${SERVICES.LIMIT.IDLE_DAYS} days`
    );
  });
});

describe("SERVICES.LIMIT", () => {
  it("keeps the idle time as whole days in milliseconds", () => {
    expect(SERVICES.LIMIT.IDLE_MS).toBe(
      SERVICES.LIMIT.IDLE_DAYS * UNIT.MS_PER_DAY
    );
  });
});
