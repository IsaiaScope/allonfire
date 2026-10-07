// @module-tag unit
import { AOFGetQueryClient } from "../aof-get-query-client";

vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-query")>()),
  isServer: false,
}));

describe("AOFGetQueryClient in the browser", () => {
  it("returns one client for the whole page, ignoring later options", () => {
    const first = AOFGetQueryClient();
    const second = AOFGetQueryClient({ staleTime: 1 });
    expect(second).toBe(first);
    expect(second.getDefaultOptions().queries?.staleTime).toBe(60_000);
  });
});
