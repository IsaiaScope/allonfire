// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFButton, aofButtonVariants } from "../components/aof-button";

const CLASS = /class="([^"]*)"/;
const classOf = (html: string) => html.match(CLASS)?.[1];
const OPTIONS = [{ variant: "outline" }, { size: "field" }] as const;

describe("AOFButton", () => {
  it("renders the shadcn button with its label", () => {
    const html = renderToStaticMarkup(<AOFButton>Save</AOFButton>);
    expect(html).toContain('data-slot="button"');
    expect(html).toContain('type="button"');
    expect(html).toContain(">Save<");
  });

  it("styles a link exactly as the button it looks like, a field's size included", () => {
    for (const options of OPTIONS) {
      const button = renderToStaticMarkup(
        <AOFButton {...options}>Save</AOFButton>
      );
      const link = renderToStaticMarkup(
        <a className={aofButtonVariants(options)} href="/">
          Save
        </a>
      );
      expect(classOf(button)).toBe(classOf(link));
    }
  });
});
