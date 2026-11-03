// @module-tag unit
import { environmentManager } from "@tanstack/react-query";
import { UNIT } from "../../../../shared/constants/units";
import { AOFGetQueryClient } from "../utils/aof-get-query-client";

describe("AOFGetQueryClient in the browser", () => {
  it("returns one client for the whole page, ignoring later options", () => {
    environmentManager.setIsServer(() => false);
    const first = AOFGetQueryClient();
    const second = AOFGetQueryClient({ staleTime: 1 });
    expect(second).toBe(first);
    expect(second.getDefaultOptions().queries?.staleTime).toBe(
      UNIT.MS_PER_MINUTE
    );
  });
});
