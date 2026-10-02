// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { DepartureBoard } from "../departure-board";
import { Hanko } from "../hanko";

const STATUS = /aria-live="polite"[^>]*>Signing in…</;

describe("DepartureBoard", () => {
  it("reads the status aloud and the running notice once", () => {
    const html = renderToStaticMarkup(
      <DepartureBoard
        kana="まもなく"
        notice="Admins only."
        noticeKana="管理者専用"
        pauseLabel="Pause notice"
        platform="1"
        status="Signing in…"
      />
    );
    expect(html).toMatch(STATUS);
    expect(html).toContain('<span class="sr-only">Admins only.</span>');
    expect(html).toContain("animate-marquee");
    expect(html).toContain('type="checkbox"');
    expect(html).toContain(">Pause notice<");
  });
});

describe("Hanko", () => {
  it("stacks its characters and hides from assistive tech", () => {
    const html = renderToStaticMarkup(<Hanko seal="認証" />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("<span>認</span><span>証</span>");
  });
});
