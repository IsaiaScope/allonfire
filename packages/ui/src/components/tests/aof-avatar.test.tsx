// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFAvatar, AOFAvatarFallback } from "../aof-avatar";

describe("AOFAvatar", () => {
  it("shows the fallback initial", () => {
    const html = renderToStaticMarkup(
      <AOFAvatar>
        <AOFAvatarFallback>A</AOFAvatarFallback>
      </AOFAvatar>
    );
    expect(html).toContain('data-slot="avatar"');
    expect(html).toContain(">A<");
  });
});
