// @module-tag unit
import { dehydrate, hydrate, QueryClient } from "@tanstack/react-query";

const KEY = ["users", "one", "user-1"];
const WAIT_MS = 5;

describe("a page hydrated after a save", () => {
  // Why a form that saves need not invalidate the browser's copy of a User:
  // the page's server read after `updateTag` is newer, and hydration keeps the newer copy.
  it("replaces the browser's older copy with the server's newer one", async () => {
    const browser = new QueryClient();
    browser.setQueryData(KEY, { image: "old" });
    await new Promise((resolve) => setTimeout(resolve, WAIT_MS));
    const server = new QueryClient();
    server.setQueryData(KEY, { image: "new" });
    hydrate(browser, dehydrate(server));
    expect(browser.getQueryData(KEY)).toEqual({ image: "new" });
  });
});
