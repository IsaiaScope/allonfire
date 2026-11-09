// @module-tag unit
import { deletionMessage } from "../deletion-message";

const say = {
  done: (count: number) => `done ${count}`,
  gone: (count: number) => `gone ${count}`,
  partly: (deleted: number, gone: number) => `partly ${deleted} ${gone}`,
};

describe("deletionMessage", () => {
  it("says done when every id went", () => {
    expect(deletionMessage(3, 3, say)).toBe("done 3");
  });

  it("says gone, with how many, when none went", () => {
    expect(deletionMessage(3, 0, say)).toBe("gone 3");
  });

  it("says how many went and how many were gone when only some did", () => {
    expect(deletionMessage(3, 1, say)).toBe("partly 1 2");
  });
});
