// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFPwa } from "../components/aof-pwa";

vi.mock("../components/aof-service-worker", () => ({
  AOFServiceWorker: () => null,
}));

vi.mock("../components/aof-dev-resume", () => ({
  AOFDevResume: () => <b>dev</b>,
}));

describe("AOFPwa", () => {
  it("renders the page, then the App's hint and banner", () => {
    const html = renderToStaticMarkup(
      <AOFPwa banner={<p>banner</p>} enabled={false} hint={<p>hint</p>}>
        <main>page</main>
      </AOFPwa>
    );
    expect(html).toBe("<main>page</main><p>hint</p><p>banner</p><b>dev</b>");
  });

  it("leaves out the dev reload in a production build", () => {
    const html = renderToStaticMarkup(
      <AOFPwa banner={null} enabled hint={null}>
        <main>page</main>
      </AOFPwa>
    );
    expect(html).toBe("<main>page</main>");
  });
});
