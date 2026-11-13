// @module-tag unit
import { HTTP } from "@allonfire/core/features/http/constants/http";
import type { UseQueryResult } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { AOFQueryView } from "../components/aof-query-view";

const failed = (retry: () => void) => (
  <div role="alert">
    <button onClick={retry} type="button">
      could not read
    </button>
  </div>
);

const view = (
  query: Partial<Pick<UseQueryResult<string, unknown>, "data" | "error">>
) =>
  renderToStaticMarkup(
    <AOFQueryView
      failed={failed}
      forbidden={<p>not allowed</p>}
      query={{
        data: undefined,
        error: null,
        refetch: () => Promise.reject(new Error("not asked")),
        ...query,
      }}
      skeleton={<p>loading</p>}
    >
      {(data) => <p>{data}</p>}
    </AOFQueryView>
  );

describe("AOFQueryView", () => {
  it("draws what its children make of the data", () => {
    expect(view({ data: "the numbers" })).toBe("<p>the numbers</p>");
  });

  it("draws the skeleton while there is nothing yet", () => {
    expect(view({})).toBe("<p>loading</p>");
  });

  it("draws what the host made for a refusal when the API refused the visitor", () => {
    const refused = Object.assign(new Error("refused"), {
      statusCode: HTTP.STATUS.FORBIDDEN,
    });
    expect(view({ error: refused })).toBe("<p>not allowed</p>");
  });

  it("draws what the host made for a failure, given a way to retry, on any other failure", () => {
    const html = view({ error: new Error("down") });
    expect(html).toContain('role="alert"');
    expect(html).toContain("could not read");
  });
});
