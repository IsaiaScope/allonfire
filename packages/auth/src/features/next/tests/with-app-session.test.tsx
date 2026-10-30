// @module-tag unit
import { renderToReadableStream, renderToStaticMarkup } from "react-dom/server";
import { AUTH } from "../../../shared/constants/auth";
import { withAppSession } from "../components/with-app-session";
import { requireAppSession } from "../utils/session";

vi.mock("../utils/session", () => ({ requireAppSession: vi.fn() }));

const PAGE = "Add a User";
const LOADING = "Loading";
const REFUSED = new Error(`redirect /it${AUTH.PAGE.SIGN_IN}`);

const Page = () => <h1>{PAGE}</h1>;
const SignedInPage = withAppSession(Page, <p>{LOADING}</p>);

describe("withAppSession", () => {
  it("draws the page while the Session check waits: it is in the static shell", () => {
    vi.mocked(requireAppSession).mockReturnValueOnce(
      new Promise(() => undefined)
    );
    const html = renderToStaticMarkup(<SignedInPage />);
    expect(html).toContain(PAGE);
    expect(html).not.toContain(LOADING);
  });

  it("runs the check on every render, and its refusal reaches the page's render", async () => {
    vi.mocked(requireAppSession).mockRejectedValueOnce(REFUSED);
    const errors: unknown[] = [];
    const stream = await renderToReadableStream(<SignedInPage />, {
      onError: (error) => {
        errors.push(error);
      },
    });
    await stream.allReady;
    expect(requireAppSession).toHaveBeenCalled();
    expect(errors).toEqual([REFUSED]);
  });
});
