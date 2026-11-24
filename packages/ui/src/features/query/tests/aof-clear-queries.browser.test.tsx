// @module-tag integration
import { AOFGetQueryClient } from "@allonfire/core/features/next/query/utils/aof-get-query-client";
import { render } from "vitest-browser-react";
import { AOFClearQueries } from "../components/aof-clear-queries";

const KEY = ["private", "feed"] as const;

describe("AOFClearQueries", () => {
  it("empties the browser's query cache once it is on screen", async () => {
    const client = AOFGetQueryClient();
    client.setQueryData(KEY, ["a photo of the last Session"]);
    await render(<AOFClearQueries />);
    await vi.waitFor(() => expect(client.getQueryData(KEY)).toBeUndefined());
    expect(client.getQueryCache().getAll()).toHaveLength(0);
  });

  it("draws nothing", async () => {
    const screen = await render(<AOFClearQueries />);
    expect(screen.container.innerHTML).toBe("");
  });
});
