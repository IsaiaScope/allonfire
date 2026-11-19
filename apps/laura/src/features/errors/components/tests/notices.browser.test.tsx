// @module-tag integration
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { createTranslator } from "next-intl";
import { renderInApp } from "@/shared/tests/render-in-app";
import { enT } from "@/shared/tests/translators";
import { ErrorNotice } from "../error-notice";
import { NotFoundNotice } from "../not-found-notice";

vi.mock("@allonfire/ui/shared/components/aof-image", async () => ({
  AOFImage: (await import("@allonfire/ui/shared/tests/image-mock")).ImageMock,
}));

vi.mock(
  "@allonfire/core/features/next/i18n/utils/aof-base-navigation",
  () => import("@allonfire/ui/shared/tests/navigation-mock")
);

const t = enT;
const errorT = createTranslator({
  locale: I18N.DEFAULT_LANGUAGE,
  messages: SHARED_TRANSLATIONS[I18N.DEFAULT_LANGUAGE],
  namespace: "Common.Error",
});

describe("ErrorNotice", () => {
  it("tells the visitor it went wrong and retries when asked", async () => {
    const retry = vi.fn();
    const screen = await renderInApp({
      children: (
        <ErrorNotice error={new Error("boom")} retry={retry} t={errorT} />
      ),
    });
    await expect
      .element(screen.getByRole("heading", { name: t("Common.Error.title") }))
      .toBeVisible();
    await screen.getByRole("button", { name: t("Common.Error.retry") }).click();
    expect(retry).toHaveBeenCalledTimes(1);
    screen.unmount();
  });
});

describe("NotFoundNotice", () => {
  it("says the page is lost and links to the start", async () => {
    const screen = await renderInApp({ children: <NotFoundNotice /> });
    await expect
      .element(
        screen.getByRole("heading", { name: t("Common.NotFound.title") })
      )
      .toBeVisible();
    await expect
      .element(screen.getByRole("link", { name: t("Common.NotFound.back") }))
      .toHaveAttribute("href", METADATA.PATH.ROOT);
    screen.unmount();
  });
});
