// @module-tag unit

import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { LOCAL } from "@allonfire/config/local/addresses";
import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import { renderToStaticMarkup } from "react-dom/server";
import { AOFUserAvatar } from "../components/aof-user-avatar";

const SIGNED = `${LOCAL.URL.IMAGE_SERVER}/sig/rs:fit:256:0/exp:1793199600/plain/s3://${IMAGE.BUCKET.DEFAULT}/avatar-u1-x.avif`;
const BLUR = "data:image/webp;base64,UklGRhoAAABXRUJQ";

/** The markup, and whatever next/image warned while rendering it. */
const render = (side: number) => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  const html = renderToStaticMarkup(
    <AOFUserAvatar blurDataUrl={BLUR} image={SIGNED} name="Ann" side={side} />
  );
  const warnings = warn.mock.calls.length;
  warn.mockRestore();
  return { html, warnings };
};

describe("AOFUserAvatar", () => {
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

  it("tints the initial's tile with the primary, or with the class it is given", () => {
    const initial = (props: { initialClassName?: string }) =>
      renderToStaticMarkup(
        <AOFUserAvatar image={null} name="Ann" side={36} {...props} />
      );
    expect(initial({})).toContain("bg-primary");
    const tinted = initial({ initialClassName: "bg-red-500" });
    expect(tinted).toContain("bg-red-500");
    expect(tinted).not.toContain("bg-primary");
  });

  it("leaves the blur out under 40 px, where next/image advises against one", () => {
    const { html, warnings } = render(36);
    expect(html).not.toContain(BLUR);
    expect(warnings).toBe(0);
  });

  describe("in a browser without URL.parse (Chrome before 126, Safari before 18)", () => {
    const { parse } = URL;
    beforeEach(() => {
      Reflect.deleteProperty(URL, "parse");
    });
    afterEach(() => {
      Reflect.set(URL, "parse", parse);
    });

    it("still draws a sign-in provider's picture, and a stored one, instead of throwing", () => {
      const google = `https://${AUTH.PICTURE_HOSTS[0]}/a/picture=s96-c`;
      expect(() =>
        renderToStaticMarkup(
          <AOFUserAvatar image={google} name="Ann" side={36} />
        )
      ).not.toThrow();
      expect(() => render(36)).not.toThrow();
    });

    it("shows only the initial for an address that is not a URL", () => {
      const html = renderToStaticMarkup(
        <AOFUserAvatar image="not a url" name="Ann" side={36} />
      );
      expect(html).toContain("A");
    });
  });
});
