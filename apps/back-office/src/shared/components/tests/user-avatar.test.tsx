// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { UserAvatar } from "../user-avatar";

const SIGNED =
  "http://localhost:9010/sig/rs:fit:256:0/exp:1793199600/plain/s3://image/avatar-u1-x.avif";
const BLUR = "data:image/webp;base64,UklGRhoAAABXRUJQ";

/** The markup, and whatever next/image warned while rendering it. */
const render = (side: number) => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  const html = renderToStaticMarkup(
    <UserAvatar blurDataUrl={BLUR} image={SIGNED} name="Ann" side={side} />
  );
  const warnings = warn.mock.calls.length;
  warn.mockRestore();
  return { html, warnings };
};

describe("UserAvatar", () => {
  it("shows a stored Avatar's signed link as it is, with no warning from next/image", () => {
    const { html, warnings } = render(36);
    expect(html).toContain(`src="${SIGNED}"`);
    expect(html).not.toContain("srcSet");
    expect(warnings).toBe(0);
  });

  it("shows its blur while it loads on a tile of 40 px or more", () => {
    const { html, warnings } = render(40);
    expect(html).toContain("background-image");
    expect(html).toContain(BLUR);
    expect(warnings).toBe(0);
  });

  it("draws the blur opaque, never through next/image's SVG filter, which on a tile this small turns see-through and lets the initial show", () => {
    const { html } = render(42);
    expect(html).not.toContain("feGaussianBlur");
  });

  it("leaves the blur out under 40 px, where next/image advises against one", () => {
    const { html, warnings } = render(36);
    expect(html).not.toContain(BLUR);
    expect(warnings).toBe(0);
  });
});
