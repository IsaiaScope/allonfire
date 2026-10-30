// @module-tag integration
import { Activity } from "react";
import { render } from "vitest-browser-react";
import { NoticeTitle } from "../notice-title";

const BEFORE = "Back Office";
const TITLE = "Page not found – Back Office";

const notice = (mode: "hidden" | "visible") => (
  <Activity mode={mode}>
    <NoticeTitle>{TITLE}</NoticeTitle>
  </Activity>
);

describe("NoticeTitle", () => {
  beforeEach(() => {
    document.title = BEFORE;
  });

  it("names the tab while its page shows, gives it back once hidden, and names it again on return", async () => {
    const screen = await render(notice("visible"));
    await expect.poll(() => document.title).toBe(TITLE);
    await screen.rerender(notice("hidden"));
    await expect.poll(() => document.title).toBe(BEFORE);
    await screen.rerender(notice("visible"));
    await expect.poll(() => document.title).toBe(TITLE);
  });

  it("leaves a title the next page set alone", async () => {
    const screen = await render(notice("visible"));
    await expect.poll(() => document.title).toBe(TITLE);
    document.title = "Users – Back Office";
    await screen.rerender(notice("hidden"));
    expect(document.title).toBe("Users – Back Office");
  });
});
