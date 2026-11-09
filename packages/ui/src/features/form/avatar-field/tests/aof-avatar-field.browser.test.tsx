// @module-tag integration
import { render } from "vitest-browser-react";
import {
  computedValue,
  roundestCorner,
} from "../../../../shared/tests/computed-style";
import { AVATAR_FIELD, AvatarForm } from "./avatar-form";

const designCorner = (token: string) =>
  computedValue("border-top-left-radius", `var(${token})`);

describe("AOFAvatarField", () => {
  it("draws its tile in the Design's corners, never round", async () => {
    const screen = await render(<AvatarForm />);
    const area = screen
      .getByRole("region", { name: AVATAR_FIELD.LABEL })
      .element();
    expect(getComputedStyle(area).borderTopLeftRadius).toBe(
      designCorner("--radius-lg")
    );
    const tile = area.firstElementChild;
    expect(tile && getComputedStyle(tile).borderTopLeftRadius).toBe(
      designCorner("--radius-md")
    );
    expect(roundestCorner(screen.container)).toBeLessThanOrEqual(
      Number.parseFloat(designCorner("--radius-lg"))
    );
  });
});
