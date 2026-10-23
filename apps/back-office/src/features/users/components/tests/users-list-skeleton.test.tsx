// @module-tag unit
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { App } from "@allonfire/database/enums";
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import { UsersListSkeleton } from "../users-list-skeleton";

const HIDDEN_TOOLBAR = /<div aria-hidden="true" class="flex flex-col/;

const html = () =>
  renderToStaticMarkup(
    <NextIntlClientProvider locale={I18N.DEFAULT_LANGUAGE} messages={EN}>
      <UsersListSkeleton />
    </NextIntlClientProvider>
  );

describe("UsersListSkeleton", () => {
  it("says the Users are loading, and hides the toolbar's shapes", () => {
    const markup = html();
    expect(markup).toContain('role="status"');
    expect(markup).toContain(EN.Users.loading);
    expect(markup).toMatch(HIDDEN_TOOLBAR);
  });

  it("draws a cell per column: the box, the email, a Role per App, the date", () => {
    const columns = objectValues(App).length + 3;
    expect(html()).toContain(`repeat(${columns}, minmax(0, 1fr))`);
  });
});
