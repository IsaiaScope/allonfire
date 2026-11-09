// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { StationNotice } from "../station-notice";

const SIGNAGE = { CODE: "404", KANA: "回送", WALL_KANJI: "迷子" };
const HEADING = "Page not found";

const notice = (props: { heading?: string }) =>
  renderToStaticMarkup(
    <StationNotice heading={props.heading} signage={SIGNAGE} />
  );

// How it rises in, or stands still: its browser test.
describe("StationNotice", () => {
  it("brushes the wall kanji and presses the station's stamp", () => {
    const html = notice({});
    expect(html).toContain(`>${SIGNAGE.WALL_KANJI}<`);
    expect(html).toContain(`>${SIGNAGE.CODE}<`);
    expect(html).toContain(`>${BACK_OFFICE.NAME}<`);
  });

  // The tab's title waits for the page to show (`NoticeTitle`, its own
  // browser test), so no markup carries it.
  it("heads the page with an h1", () => {
    expect(notice({ heading: HEADING })).toMatch(
      new RegExp(`<h1[^>]*>${HEADING}</h1>`)
    );
  });

  it("in a part of a page, heads it with an h2 and leaves the tab alone", () => {
    const html = renderToStaticMarkup(
      <StationNotice heading={HEADING} scope="part" signage={SIGNAGE} />
    );
    expect(html).toMatch(new RegExp(`<h2[^>]*>${HEADING}</h2>`));
    expect(html).not.toContain("<h1");
    expect(html).not.toContain("<title>");
  });
});
