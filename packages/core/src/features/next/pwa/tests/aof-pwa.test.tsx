// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFPwa } from "../aof-pwa";

vi.mock("../aof-service-worker", () => ({ AOFServiceWorker: () => null }));

describe("AOFPwa", () => {
  it("renders the page, then the App's hint and banner", () => {
    const html = renderToStaticMarkup(
      <AOFPwa banner={<p>banner</p>} enabled={false} hint={<p>hint</p>}>
        <main>page</main>
      </AOFPwa>
    );
    expect(html).toBe("<main>page</main><p>hint</p><p>banner</p>");
  });
});
