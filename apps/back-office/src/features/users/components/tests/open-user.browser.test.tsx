// @module-tag integration
import { DATE } from "@allonfire/core/features/i18n/constants/dates";
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { USERS_PAGE } from "@/shared/tests/msw/handlers";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import { OpenUser } from "../user-columns";

vi.mock("@/features/i18n/navigation", async () => ({
  Link: (await import("@/shared/tests/link-mock")).LinkMock,
}));

const [USER] = USERS_PAGE.users;

const renderLink = () => {
  if (!USER) {
    throw new Error("USERS_PAGE has no User");
  }
  return render(
    <NextIntlClientProvider
      formats={DATE.FORMATS}
      locale={I18N.DEFAULT_LANGUAGE}
      messages={EN}
      timeZone={DATE.TIME_ZONE}
    >
      <OpenUser user={USER} />
    </NextIntlClientProvider>
  );
};

const link = () => page.getByRole("link");

describe("OpenUser", () => {
  // Rendered with no pointer at all: one left over from another test file
  // can sit where the link appears and reach it on render.
  it("prefetches nothing of its own before intent", () => {
    if (!USER) {
      throw new Error("USERS_PAGE has no User");
    }
    expect(
      renderToStaticMarkup(
        <NextIntlClientProvider
          formats={DATE.FORMATS}
          locale={I18N.DEFAULT_LANGUAGE}
          messages={EN}
          timeZone={DATE.TIME_ZONE}
        >
          <OpenUser user={USER} />
        </NextIntlClientProvider>
      )
    ).toContain('data-prefetch="false"');
  });

  it("prefetches on pointer enter", async () => {
    await renderLink();
    await userEvent.hover(link());
    await expect.element(link()).toHaveAttribute("data-prefetch", "true");
  });

  it("prefetches on focus", async () => {
    await renderLink();
    await userEvent.tab();
    await expect.element(link()).toHaveAttribute("data-prefetch", "true");
  });

  it("prefetches when a finger lands", async () => {
    await renderLink();
    link()
      .element()
      .dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch" })
      );
    await expect.element(link()).toHaveAttribute("data-prefetch", "true");
  });
});
