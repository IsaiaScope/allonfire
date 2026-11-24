// @module-tag unit

import { objectValues } from "@allonfire/core/shared/utils/object";
import { AOF_ACTION } from "@allonfire/ui/shared/constants/action";
import { AUTH_DRESSING } from "../dressing";

describe("AUTH_DRESSING", () => {
  it("dresses every action the shared pages draw", () => {
    for (const action of objectValues(AOF_ACTION)) {
      expect(AUTH_DRESSING.actions.marks).toHaveProperty(action);
    }
  });

  it("gives the actions a look of their own and a way back to Sign in", () => {
    expect(AUTH_DRESSING.actions.className).not.toBe("");
    expect(AUTH_DRESSING.back).toBeDefined();
  });
});
