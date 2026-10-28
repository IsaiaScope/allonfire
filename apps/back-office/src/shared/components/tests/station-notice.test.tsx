// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { StationNotice } from "../station-notice";

const SIGNAGE = { CODE: "404", KANA: "回送", WALL_KANJI: "迷子" };
const HEADING = "Page not found";

const notice = (props: { action?: string; heading?: string }) =>
  renderToStaticMarkup(
    <StationNotice
      action={props.action ? <span>{props.action}</span> : undefined}
      heading={props.heading}
      signage={SIGNAGE}
    />
  );

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

  it("raises the words after the stamp, then the action after the words", () => {
    const html = notice({ action: "Back" });
    const words = html.indexOf("motion-safe:delay-700");
    const action = html.indexOf("motion-safe:delay-1000");
    expect(words).toBeGreaterThan(-1);
    expect(action).toBeGreaterThan(words);
    expect(html.indexOf(">Back<")).toBeGreaterThan(action);
  });

  it("renders no action wrapper without an action", () => {
    expect(notice({})).not.toContain("motion-safe:delay-1000");
  });

  it("stands still from the first frame without its entrance: a wait shows it all at once", () => {
    const html = renderToStaticMarkup(
      <StationNotice
        action={<span>Back</span>}
        entrance={false}
        signage={SIGNAGE}
      />
    );
    expect(html).not.toContain("motion-safe:animate-in");
    expect(html).not.toContain("motion-safe:animate-stamp");
  });
});
