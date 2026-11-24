// @module-tag unit
import { apiUrlFor } from "../utils/api-url";

const LOCAL_URL = "http://localhost:3300";
const REMOTE_URL = "https://api.example.test";

describe("apiUrlFor", () => {
  it.each(["localhost", "127.0.0.1", "[::1]"])(
    "calls the local API from a page on %s",
    (hostname) => {
      expect(
        apiUrlFor(hostname, { local: LOCAL_URL, remote: REMOTE_URL })
      ).toBe(LOCAL_URL);
    }
  );

  it("calls the remote API from a page on any other host", () => {
    expect(
      apiUrlFor("back-office.example.test", {
        local: LOCAL_URL,
        remote: REMOTE_URL,
      })
    ).toBe(REMOTE_URL);
  });

  it("always calls the one API when no remote one is set (Production)", () => {
    expect(
      apiUrlFor("back-office.example.test", {
        local: "https://api.example.test",
        remote: undefined,
      })
    ).toBe("https://api.example.test");
  });

  it("calls the local API where there is no page (the server)", () => {
    expect(apiUrlFor(undefined, { local: LOCAL_URL, remote: REMOTE_URL })).toBe(
      LOCAL_URL
    );
  });
});
