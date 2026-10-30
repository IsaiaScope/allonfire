// @module-tag integration

import { API } from "@allonfire/api/shared/constants/api";
import { TEST_API_URL } from "@allonfire/config/local/addresses";
import { takeUnhandled, worker } from "@allonfire/config/tests/browser/msw";
import { HttpResponse, http } from "msw";
import { HEALTH_OK } from "@/shared/tests/msw/handlers";
import { api } from "../api";

describe("api", () => {
  it("calls the public API address with the visitor's cookies", async () => {
    let credentials: RequestCredentials | undefined;
    worker.use(
      http.get(
        `${TEST_API_URL}${API.PATH.HEALTH}`,
        ({ request: { credentials: sent } }) => {
          credentials = sent;
          return HttpResponse.json(HEALTH_OK);
        }
      )
    );
    const response = await api.health.$get();
    expect(response.ok).toBe(true);
    expect(credentials).toBe("include");
  });

  it("fails a test whose request no handler answers", async () => {
    const url = `${TEST_API_URL}/nobody-faked-this`;
    await expect(fetch(url)).rejects.toThrow();
    // Read here so this test passes; any other test fails in the setup.
    expect(takeUnhandled()).toEqual([`GET ${url}`]);
  });
});
