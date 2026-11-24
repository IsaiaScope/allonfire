// @module-tag unit
import { Role } from "@allonfire/database/enums";
import { renderToReadableStream, renderToStaticMarkup } from "react-dom/server";
import { AUTH } from "../../../shared/constants/auth";
import { withAppSession } from "../components/with-app-session";
import { requireAppSession } from "../utils/session";
import { sessionOf } from "./session-request-mocks";

vi.mock("../utils/session", () => ({ requireAppSession: vi.fn() }));

const PAGE = "Add a User";
const LOADING = "Loading";
const REFUSED = new Error(`redirect /it${AUTH.PAGE.SIGN_IN}`);

const Page = () => <h1>{PAGE}</h1>;
const SignedInPage = withAppSession(Page, <p>{LOADING}</p>);

describe("withAppSession", () => {
  it("hands the Section's minRole to the check", async () => {
    vi.mocked(requireAppSession).mockResolvedValueOnce(sessionOf([]));
    const Gated = withAppSession(Page, <p>{LOADING}</p>, {
      minRole: Role.ADMIN,
    });
    await (await renderToReadableStream(<Gated />)).allReady;
    expect(requireAppSession).toHaveBeenCalledWith({ minRole: Role.ADMIN });
  });

  it("asks the bare check of a page with no minRole, so the frame and the page share one cached read", async () => {
    vi.mocked(requireAppSession).mockClear();
    vi.mocked(requireAppSession).mockResolvedValueOnce(sessionOf([]));
    await (await renderToReadableStream(<SignedInPage />)).allReady;
    expect(requireAppSession).toHaveBeenCalledWith();
  });

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
