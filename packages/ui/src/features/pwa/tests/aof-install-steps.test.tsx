// @module-tag unit
import { PWA } from "@allonfire/core/features/next/pwa/constants/pwa";
import { renderToStaticMarkup } from "react-dom/server";
import { AOFInstallSteps } from "../components/aof-install-steps";

const { STEP } = PWA.INSTALL_HINT;
const ICONS = {
  [STEP.IOS_ADD]: ({ className }: { className?: string }) => (
    <svg className={className} data-icon="add" />
  ),
  [STEP.IOS_SHARE]: ({ className }: { className?: string }) => (
    <svg className={className} data-icon="share" />
  ),
  [STEP.MAC_ADD_TO_DOCK]: ({ className }: { className?: string }) => (
    <svg className={className} data-icon="dock" />
  ),
};

const STEPS_IN_ORDER = /<ol[^>]*>.*Tap Share.*Add to Home Screen/;
const ARIA_HIDDEN = /aria-hidden="true"/g;
const HIDDEN_WORDS = /aria-hidden="true"[^>]*>Tap Share/;

const markup = renderToStaticMarkup(
  <AOFInstallSteps
    classNames={{
      icon: "ICON-DRESS",
      number: "NUMBER-DRESS",
      text: "TEXT-DRESS",
    }}
    icons={ICONS}
    steps={[
      { step: STEP.IOS_SHARE, text: "Tap Share" },
      { step: STEP.IOS_ADD, text: "Add to Home Screen" },
    ]}
  />
);

describe("AOFInstallSteps", () => {
  it("lists the steps in order, numbered from one, each with its words", () => {
    expect(markup).toMatch(STEPS_IN_ORDER);
    expect(markup).toContain(">1</span>");
    expect(markup).toContain(">2</span>");
    expect(markup).not.toContain(">3</span>");
  });

  it("draws each step's own icon in the icon's column", () => {
    expect(markup).toContain('data-icon="share"');
    expect(markup).toContain('data-icon="add"');
    expect(markup).not.toContain('data-icon="dock"');
  });

  it("hides the number and the icon from a screen reader, never the words", () => {
    expect(markup.match(ARIA_HIDDEN)).toHaveLength(4);
    expect(markup).not.toMatch(HIDDEN_WORDS);
  });

  it("wears the Design's own dressing on each part", () => {
    expect(markup).toContain("NUMBER-DRESS");
    expect(markup).toContain("TEXT-DRESS");
    expect(markup).toContain("ICON-DRESS");
  });
});
