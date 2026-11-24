// @module-tag integration
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { ACTION_KANJI } from "@/shared/constants/action-kanji";
import { renderInApp } from "@/shared/tests/render-in-app";
import { BackToSignIn } from "../back-to-sign-in";

const BACK = SHARED_TRANSLATIONS.en.Common.Auth.ForgotPassword.back;

describe("BackToSignIn", () => {
  it("is the Japan icon button: Sign in, its kanji brushed in, named by a tip above it", async () => {
    const screen = await renderInApp({
      children: (
        // Room above, or the tip flips below the button.
        <div style={{ paddingTop: 200 }}>
          <BackToSignIn />
        </div>
      ),
    });
    const link = screen.getByRole("link", { name: BACK });
    await expect
      .element(link)
      .toHaveAttribute("href", expect.stringContaining(AUTH.PAGE.SIGN_IN));
    await expect.element(link).toHaveTextContent(ACTION_KANJI.BACK);
    const box = link.element().getBoundingClientRect();
    await link.hover();
    // Base UI's tooltip popup carries no role: find it by its slot. It slides
    // in, so its place is read once it has settled above the button.
    const tip = () => document.querySelector('[data-slot="tooltip-content"]');
    await expect.poll(() => tip()?.textContent).toContain(BACK);
    await expect
      .poll(() => tip()?.getBoundingClientRect().bottom)
      .toBeLessThanOrEqual(box.top + 1);
  });
});
