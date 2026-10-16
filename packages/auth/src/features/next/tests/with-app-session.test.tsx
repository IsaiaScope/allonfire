// @module-tag unit
import { renderToReadableStream, renderToStaticMarkup } from "react-dom/server";
import { withAppSession } from "../components/with-app-session";
import { requireAppSession } from "../utils/session";

vi.mock("../utils/session", () => ({ requireAppSession: vi.fn() }));

const FALLBACK = "Waiting";
const HEADING = "Home";
/** How many times the page rendered: never before the check lets it. */
const rendered = { count: 0 };
const Page = ({ heading }: { heading: string }) => {
  rendered.count += 1;
  return <h1>{heading}</h1>;
};
const SignedInPage = withAppSession(Page, <p>{FALLBACK}</p>);

/** The page's HTML once everything it waits for has settled. */
const renderSettled = async () => {
  const stream = await renderToReadableStream(
    <SignedInPage heading={HEADING} />,
    { onError: () => undefined }
  );
  await stream.allReady;
  return new Response(stream).text();
};

beforeEach(() => {
  rendered.count = 0;
});

describe("withAppSession", () => {
  it("shows the fallback, never the page, while the check waits", () => {
    vi.mocked(requireAppSession).mockReturnValueOnce(
      new Promise(() => undefined)
    );
    const html = renderToStaticMarkup(<SignedInPage heading={HEADING} />);
    expect(html).toContain(FALLBACK);
    expect(rendered.count).toBe(0);
  });

  it("renders the page, with its props, once the check lets the visitor in", async () => {
    vi.mocked(requireAppSession).mockResolvedValueOnce(Object.create(null));
    expect(await renderSettled()).toContain(HEADING);
  });

  it("never renders the page when the check redirects", async () => {
    vi.mocked(requireAppSession).mockRejectedValueOnce(
      new Error("NEXT_REDIRECT")
    );
    await renderSettled();
    expect(rendered.count).toBe(0);
  });
});
