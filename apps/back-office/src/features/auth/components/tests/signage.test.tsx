// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { DepartureBoard } from "../departure-board";

const STATUS = /aria-live="polite"[^>]*>Signing in…</;

// The notice read once and running: its browser test.
describe("DepartureBoard", () => {
  it("reads the status aloud and names its pause", () => {
    const html = renderToStaticMarkup(
      <DepartureBoard
        kana="まもなく"
        notice={{
          kana: "管理者専用",
          pauseLabel: "Pause notice",
          text: "Admins only.",
        }}
        platform="1"
        status="Signing in…"
      />
    );
    expect(html).toMatch(STATUS);
    expect(html).toContain('type="checkbox"');
    expect(html).toContain(">Pause notice<");
  });
});
