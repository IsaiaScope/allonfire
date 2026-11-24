// @module-tag unit
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { AOFSignOutForm } from "../components/aof-sign-out-form";
import { NAVIGATION } from "../constants/navigation";

vi.mock("@allonfire/auth/features/next/actions/sign-out", () => ({
  signOut: vi.fn(),
}));

describe("AOFSignOutForm", () => {
  it("is the form the account menu's Sign out button names", () => {
    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale="en" messages={{}}>
        <AOFSignOutForm />
      </NextIntlClientProvider>
    );
    expect(html).toContain(`id="${NAVIGATION.FORM.SIGN_OUT}"`);
    expect(html).toContain("<form");
  });
});
