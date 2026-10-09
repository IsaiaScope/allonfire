// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFField, AOFFieldError, AOFFieldLabel } from "../aof-field";

describe("AOFField", () => {
  it("renders the shadcn field, its label and its error", () => {
    const html = renderToStaticMarkup(
      <AOFField>
        <AOFFieldLabel htmlFor="email">Email</AOFFieldLabel>
        <AOFFieldError
          errors={[{ message: "Enter your email." }]}
          id="email-error"
        />
      </AOFField>
    );
    expect(html).toContain('data-slot="field"');
    expect(html).toContain('for="email"');
    expect(html).toContain('id="email-error"');
    expect(html).toContain("Enter your email.");
  });

  it("keeps field errors out of live regions, so typing is not interrupted", () => {
    const html = renderToStaticMarkup(
      <AOFFieldError errors={[{ message: "Enter your email." }]} />
    );
    expect(html).toContain("Enter your email.");
    expect(html).not.toContain('role="alert"');
  });

  it("renders no error when there is none", () => {
    expect(renderToStaticMarkup(<AOFFieldError errors={[]} />)).toBe("");
  });
});
