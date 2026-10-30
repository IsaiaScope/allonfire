// @module-tag unit
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { App } from "@allonfire/database/enums";
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import { UsersListSkeleton } from "../users-list-skeleton";

const HIDDEN_TOOLBAR = /<div aria-hidden="true" class="@container"/;

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

  it("lays the columns out as the list does: the box, the email widest, a Role per App, the date", () => {
    const tracks = [
      "48px",
      "minmax(0,1fr)",
      ...objectValues(App).map(() => "140px"),
      "140px",
    ];
    expect(html()).toContain(`grid-template-columns:${tracks.join(" ")}`);
  });

  it("gives a phone cards and keeps the pager's place", () => {
    const markup = html();
    expect(markup).toContain('data-skeleton="card"');
    expect(markup).toContain('data-skeleton="pager"');
  });
});
