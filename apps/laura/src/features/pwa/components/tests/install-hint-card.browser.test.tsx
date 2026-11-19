// @module-tag integration
import { PWA } from "@allonfire/core/features/next/pwa/constants/pwa";
import { render } from "vitest-browser-react";
import { InstallHintCard } from "../install-hint-card";

vi.mock("@allonfire/ui/shared/components/aof-image", async () => ({
  AOFImage: (await import("@allonfire/ui/shared/tests/image-mock")).ImageMock,
}));

const { STEP } = PWA.INSTALL_HINT;
const CTA = "Add Laura to your Home Screen";
const INSTALL = "Install";
const DISMISS = "Not now";

describe("InstallHintCard", () => {
  it("offers Install and a dismiss button, each named and wired", async () => {
    const install = vi.fn();
    const dismiss = vi.fn();
    const screen = await render(
      <InstallHintCard
        cta={CTA}
        dismissProps={{ "aria-label": DISMISS, onClick: dismiss }}
        installProps={{ children: INSTALL, onClick: install, pending: false }}
      />
    );
    await expect.element(screen.getByText(CTA)).toBeVisible();
    await screen.getByRole("button", { name: INSTALL }).click();
    await screen.getByRole("button", { name: DISMISS }).click();
    expect(install).toHaveBeenCalledTimes(1);
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it("disables Install while it is pending", async () => {
    const screen = await render(
      <InstallHintCard
        cta={CTA}
        dismissProps={{ "aria-label": DISMISS }}
        installProps={{ children: INSTALL, pending: true }}
      />
    );
    await expect
      .element(screen.getByRole("button", { name: INSTALL }))
      .toBeDisabled();
  });

  it("lists the browser's steps in order when it has no dialog", async () => {
    const screen = await render(
      <InstallHintCard
        cta={CTA}
        dismissProps={{ "aria-label": DISMISS }}
        steps={[
          { step: STEP.IOS_SHARE, text: "Tap Share" },
          { step: STEP.IOS_ADD, text: "Tap Add to Home Screen" },
        ]}
      />
    );
    const steps = screen.getByRole("listitem");
    await expect.element(steps.first()).toHaveTextContent("Tap Share");
    await expect
      .element(steps.last())
      .toHaveTextContent("Tap Add to Home Screen");
  });

  it("says so under the words when the install failed", async () => {
    const screen = await render(
      <InstallHintCard
        cta={CTA}
        dismissProps={{ "aria-label": DISMISS }}
        error="It did not install"
        installProps={{ children: INSTALL, pending: false }}
      />
    );
    await expect
      .element(screen.getByRole("alert"))
      .toHaveTextContent("It did not install");
  });
});
