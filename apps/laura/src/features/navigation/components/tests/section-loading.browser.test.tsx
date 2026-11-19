// @module-tag integration
import {
  CAN_EMULATE_MEDIA,
  withReducedMotion,
} from "@allonfire/ui/shared/tests/emulated-media";
import { renderInApp } from "@/shared/tests/render-in-app";
import { enT } from "@/shared/tests/translators";
import { SectionLoading } from "../section-loading";

vi.mock("@allonfire/ui/shared/components/aof-image", async () => ({
  AOFImage: (await import("@allonfire/ui/shared/tests/image-mock")).ImageMock,
}));

/** Every element the browser is animating. */
const animated = () =>
  [...document.querySelectorAll("*")].filter(
    (element) => getComputedStyle(element).animationName !== "none"
  );

describe("SectionLoading", () => {
  it("says it is waiting, in a status outside any busy region", async () => {
    const screen = await renderInApp({ children: <SectionLoading /> });
    await expect
      .element(screen.getByRole("status"))
      .toHaveTextContent(enT("Common.Loading.label"));
    expect(document.querySelector("[aria-busy]")).toBeNull();
    screen.unmount();
  });

  it("pulses its octopus otherwise", async () => {
    const screen = await renderInApp({ children: <SectionLoading /> });
    expect(animated().length).toBeGreaterThan(0);
    screen.unmount();
  });
});

// Only Chromium can be told the visitor asked for less motion.
describe.runIf(CAN_EMULATE_MEDIA)("SectionLoading, for reduced motion", () => {
  it("stands still", async () => {
    const running = await withReducedMotion(async () => {
      const screen = await renderInApp({ children: <SectionLoading /> });
      const count = animated().length;
      screen.unmount();
      return count;
    });
    expect(running).toBe(0);
  });
});
