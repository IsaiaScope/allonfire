// @module-tag unit

import { DetailedError } from "hono/client";
import { HTTP } from "../../../http/constants/http";
import { staticQuery } from "../utils/static-query";

const broken = new DetailedError("broken", {
  statusCode: HTTP.STATUS.INTERNAL_SERVER_ERROR,
});
const refused = new DetailedError("refused", {
  statusCode: HTTP.STATUS.FORBIDDEN,
});

describe("staticQuery", () => {
  it("never reads the clock: the query is static, never a number", () => {
    expect(staticQuery().staleTime).toBe("static");
    expect(staticQuery({ retries: 1, silent: true }).staleTime).toBe("static");
  });

  it("gives no retry and no meta when asked for none", () => {
    const options = staticQuery();
    expect("retry" in options).toBe(false);
    expect("meta" in options).toBe(false);
  });

  it("retries a server failure up to the limit and never a refusal", () => {
    const { retry } = staticQuery({ retries: 2 });
    expect(retry?.(0, broken)).toBe(true);
    expect(retry?.(2, broken)).toBe(false);
    expect(retry?.(0, refused)).toBe(false);
  });

  it("tells no failure in a toast when silent (the page tells it)", () => {
    expect(staticQuery({ silent: true }).meta).toEqual({ errorToast: false });
  });
});
