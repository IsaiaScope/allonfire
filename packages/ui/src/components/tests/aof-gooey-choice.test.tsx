// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFGooeyChoice } from "../aof-gooey-choice";

const OPTIONS = [
  { icon: <span />, label: "Not a member", value: "none" },
  { icon: <span />, label: "User", value: "USER" },
] as const;
const nothing = () => undefined;
const POSTED = /<input type="hidden" name="roles.laura" value="USER"\/>/;
const PILL = "#00a650";
const INK = "#1a1a1a";

const html = () =>
  renderToStaticMarkup(
    <AOFGooeyChoice
      ink={INK}
      label="Laura"
      name="roles.laura"
      onValueChange={nothing}
      options={OPTIONS}
      pill={PILL}
      value="USER"
    />
  );

describe("AOFGooeyChoice", () => {
  it("names its group and posts the chosen value", () => {
    const markup = html();
    expect(markup).toContain('role="radiogroup"');
    expect(markup).toContain('aria-label="Laura"');
    expect(markup).toMatch(POSTED);
  });

  it("draws every option's label", () => {
    const markup = html();
    expect(markup).toContain("Not a member");
    expect(markup).toContain("User");
  });

  it("paints the pill in its colours from the first render, before any effect", () => {
    const markup = html();
    expect(markup).toContain(`--gn-pill:${PILL}`);
    expect(markup).toContain(`--gn-active-ink:${INK}`);
  });

  it("draws the frame in the Design's tokens, so it follows the scheme with no script", () => {
    expect(html()).toContain("--gn-frame:var(--muted)");
  });
});
