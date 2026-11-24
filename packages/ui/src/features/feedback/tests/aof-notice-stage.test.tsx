// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import type { AOFPageProps } from "../../navigation/components/aof-page";
import { AOFNoticeStage } from "../components/aof-notice-stage";

const Section = (props: AOFPageProps) => <section {...props} />;

describe("AOFNoticeStage", () => {
  it("fills the page with the notice, centred, as the main landmark", () => {
    const html = renderToStaticMarkup(
      <AOFNoticeStage>
        <p>Lost</p>
      </AOFNoticeStage>
    );
    expect(html).toContain("<main");
    expect(html).toContain("Lost");
  });

  it("boxes the notice as a part of a page, in the caller's own corners", () => {
    const html = renderToStaticMarkup(
      <AOFNoticeStage className="rounded-xl" scope="part">
        <p>Empty</p>
      </AOFNoticeStage>
    );
    expect(html).not.toContain("<main");
    expect(html).toContain("rounded-xl");
    expect(html).toContain("Empty");
  });

  it("draws the page inside the frame the caller names", () => {
    const html = renderToStaticMarkup(
      <AOFNoticeStage page={Section}>
        <p>Waiting</p>
      </AOFNoticeStage>
    );
    expect(html).toContain("<section");
    expect(html).not.toContain("<main");
  });
});
