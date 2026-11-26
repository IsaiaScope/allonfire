// @module-tag integration
import { IconTrash } from "@tabler/icons-react";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { AOFLightboxButton } from "../components/aof-lightbox-button";

const LABEL = "Remove the image";
const NAME = "Favorite";
const SIZE = { BUTTON: 44, ICON: 28 } as const;

describe("AOFLightboxButton", () => {
  it("is a 44px target named by its tip, around a 28px icon", async () => {
    await render(
      <AOFLightboxButton label={LABEL}>
        <IconTrash aria-hidden />
      </AOFLightboxButton>
    );
    const button = page.getByRole("button", { name: LABEL }).element();
    expect(button.getBoundingClientRect().width).toBe(SIZE.BUTTON);
    expect(button.getBoundingClientRect().height).toBe(SIZE.BUTTON);
    expect(button.querySelector("svg")?.getBoundingClientRect().width).toBe(
      SIZE.ICON
    );
  });

  it("takes a name of its own beside the tip", async () => {
    await render(
      <AOFLightboxButton aria-label={NAME} label={LABEL}>
        <IconTrash aria-hidden />
      </AOFLightboxButton>
    );
    const button = page.getByRole("button", { name: NAME });
    await expect.element(button).toBeInTheDocument();
    await userEvent.tab();
    await expect.element(page.getByText(LABEL)).toBeVisible();
  });
});
