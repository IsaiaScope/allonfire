// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFSubmitButton } from "../components/aof-submit-button";

const render = (pending: boolean) =>
  renderToStaticMarkup(
    <AOFSubmitButton pending={pending} pendingChildren="Signing in…">
      Sign in
    </AOFSubmitButton>
  );

describe("AOFSubmitButton", () => {
  it("submits and says its label when idle", () => {
    const html = render(false);
    expect(html).toContain('type="submit"');
    expect(html).toContain("Sign in");
    expect(html).not.toContain("Signing in…");
    expect(html).not.toContain(' disabled=""');
    expect(html).not.toContain("aria-busy");
  });

  it("is disabled and busy while pending, so a second click does nothing", () => {
    const html = render(true);
    expect(html).toContain(' disabled=""');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Signing in…");
  });

  it("can be switched off by its form, keeping its label and not claiming to be busy", () => {
    const html = renderToStaticMarkup(
      <AOFSubmitButton disabled pending={false} pendingChildren="Sending…">
        Send link
      </AOFSubmitButton>
    );
    expect(html).toContain(' disabled=""');
    expect(html).toContain("Send link");
    expect(html).not.toContain("aria-busy");
  });
});
