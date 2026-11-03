// @module-tag integration

import { USER } from "@allonfire/auth/features/users/constants/users";
import { DATE } from "@allonfire/core/features/i18n/constants/dates";
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { App, Role } from "@allonfire/database/enums";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { AOFFreshOnReturn } from "@allonfire/ui/features/query/components/aof-fresh-on-return";
import { aofToast } from "@allonfire/ui/shared/hooks/use-aof-toast";
import { NextIntlClientProvider } from "next-intl";
import { Activity, type ReactNode } from "react";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { APP_ENTRY } from "@/shared/constants/apps";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { enT } from "@/shared/tests/translators";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import { type AddUserState, addUser } from "../../actions/add-user";
import { USERS } from "../../constants/users";
import { replace } from "../../tests/user-form-mocks";
import { AddUser } from "../add-user";

vi.mock("../../actions/add-user", () => ({ addUser: vi.fn() }));
// jscpd:ignore-start
// Every User form test mocks the same modules: Vitest hoists each vi.mock
// within its own file, so only the factories are shared (user-form-mocks).
vi.mock(
  "@/features/i18n/navigation",
  () => import("../../tests/user-form-mocks")
);
vi.mock("@allonfire/ui/shared/hooks/use-aof-toast", async (original) => ({
  ...(await original<
    typeof import("@allonfire/ui/shared/hooks/use-aof-toast")
  >()),
  aofToast: vi.fn(),
}));
vi.mock(
  "@allonfire/ui/shared/components/aof-image",
  () => import("../../tests/user-form-mocks")
);
// jscpd:ignore-end

const t = EN.Users.add;
/** The words both User forms share. */
const FORM = EN.Users.form;
const roleRow = (app: App) =>
  page.getByRole("radiogroup", {
    name: enT("Users.form.role", { app: APP_ENTRY[app].name }),
  });
const NEW = {
  email: "new@add-user.test",
  name: "New",
  password: FIXTURE.PASSWORD,
};

const Providers = ({ children }: { children: ReactNode }) => (
  <NextIntlClientProvider
    formats={DATE.FORMATS}
    locale={I18N.DEFAULT_LANGUAGE}
    messages={EN}
    timeZone={DATE.TIME_ZONE}
  >
    {children}
  </NextIntlClientProvider>
);

const renderForm = () =>
  render(
    <Providers>
      <AddUser />
    </Providers>
  );

/** The page as Next keeps it: shown, or hidden in `<Activity>` once left. */
const pageShown = (visible: boolean) => (
  <Providers>
    <Activity mode={visible ? "visible" : "hidden"}>
      <AOFFreshOnReturn>
        <AddUser />
      </AOFFreshOnReturn>
    </Activity>
  </Providers>
);

const fill = async () => {
  await page.getByLabelText(t.email, { exact: true }).fill(NEW.email);
  await page.getByLabelText(FORM.name, { exact: true }).fill(NEW.name);
  await page.getByLabelText(FORM.password, { exact: true }).fill(NEW.password);
  await page
    .getByLabelText(FORM.confirmPassword, { exact: true })
    .fill(NEW.password);
};

/** A password rule's to-do box, named by its words. */
const rule = (text: string) => page.getByRole("checkbox", { name: text });

beforeEach(() => {
  vi.mocked(addUser).mockReset();
  return page.viewport(
    SCREEN.VIEWPORT.DESKTOP.WIDTH,
    SCREEN.VIEWPORT.DESKTOP.HEIGHT
  );
});

describe("AddUser on its page", () => {
  it("opens empty again after its page was left: nothing typed is kept", async () => {
    const screen = await render(pageShown(true));
    await fill();
    await screen.rerender(pageShown(false));
    await screen.rerender(pageShown(true));
    await Promise.all(
      [t.email, FORM.name, FORM.password, FORM.confirmPassword].map((label) =>
        expect
          .element(page.getByLabelText(label, { exact: true }))
          .toHaveValue("")
      )
    );
  });
});

describe("AddUser", () => {
  it("shows a Role row per App, offering only Roles that reach its floor", async () => {
    await renderForm();
    await expect.element(roleRow(App.LAURA)).toBeVisible();
    expect(
      await roleRow(App.BACK_OFFICE).getByRole("button").all()
    ).toHaveLength(2);
    expect(await roleRow(App.LAURA).getByRole("button").all()).toHaveLength(4);
    await expect
      .element(
        roleRow(App.BACK_OFFICE).getByRole("button", {
          name: EN.Navigation.role[Role.ADMIN],
        })
      )
      .toBeVisible();
  });

  it("checks the fields before posting", async () => {
    await renderForm();
    await page.getByRole("button", { name: t.submit }).click();
    await expect.element(page.getByText(t.field.emailRequired)).toBeVisible();
    expect(addUser).not.toHaveBeenCalled();
  });

  it("ticks each password rule live, as it is met", async () => {
    await renderForm();
    const password = page.getByLabelText(FORM.password, { exact: true });
    const length = rule(
      enT("Users.form.rule.length", { min: USER.LIMIT.PASSWORD_MIN })
    );
    await expect.element(length).not.toBeChecked();
    await password.fill("a");
    await expect.element(rule(FORM.rule.lowercase)).toBeChecked();
    await expect.element(rule(FORM.rule.uppercase)).not.toBeChecked();
    await password.fill(NEW.password);
    await Promise.all(
      [
        length,
        rule(FORM.rule.uppercase),
        rule(FORM.rule.number),
        rule(FORM.rule.symbol),
      ].map((met) => expect.element(met).toBeChecked())
    );
    await expect.element(rule(FORM.rule.match)).not.toBeChecked();
    await page
      .getByLabelText(FORM.confirmPassword, { exact: true })
      .fill(NEW.password);
    await expect.element(rule(FORM.rule.match)).toBeChecked();
  });

  it("keeps the rules out of the tab order: they only report", async () => {
    await renderForm();
    await expect
      .element(rule(FORM.rule.match))
      .toHaveAttribute("tabindex", "-1");
  });

  it("refuses to post when the confirmation differs", async () => {
    await renderForm();
    await fill();
    await page
      .getByLabelText(FORM.confirmPassword, { exact: true })
      .fill(`${NEW.password}y`);
    await page.getByRole("button", { name: t.submit }).click();
    await expect
      .element(page.getByText(FORM.field.passwordMismatch))
      .toBeVisible();
    expect(addUser).not.toHaveBeenCalled();
  });

  it("posts the typed values and the chosen Roles", async () => {
    vi.mocked(addUser).mockResolvedValue({});
    await renderForm();
    await fill();
    await roleRow(App.LAURA)
      .getByRole("button", { name: EN.Navigation.role[Role.USER] })
      .click();
    await page.getByRole("button", { name: t.submit }).click();
    await expect.poll(() => vi.mocked(addUser).mock.calls.length).toBe(1);
    const form = vi.mocked(addUser).mock.calls[0]?.[2];
    expect(form?.get("email")).toBe(NEW.email);
    expect(form?.get(`roles.${App.LAURA}`)).toBe(Role.USER);
  });

  it("a taken email marks the email field and keeps what was typed", async () => {
    const taken: AddUserState = { error: USERS.ADD_ERROR.TAKEN };
    vi.mocked(addUser).mockResolvedValue(taken);
    await renderForm();
    await fill();
    await page.getByRole("button", { name: t.submit }).click();
    await expect.element(page.getByText(t.error.taken)).toBeVisible();
    await expect
      .element(page.getByLabelText(t.email, { exact: true }))
      .toHaveAttribute("aria-invalid", "true");
    await expect
      .element(page.getByLabelText(FORM.name, { exact: true }))
      .toHaveValue(NEW.name);
  });

  it("any other refusal shows one message over the form", async () => {
    const refused: AddUserState = { error: USERS.ADD_ERROR.INVALID };
    vi.mocked(addUser).mockResolvedValue(refused);
    await renderForm();
    await fill();
    await page.getByRole("button", { name: t.submit }).click();
    await expect.element(page.getByText(t.error.invalid)).toBeVisible();
  });

  it("the Role rows fit a phone", async () => {
    await page.viewport(
      SCREEN.VIEWPORT.PHONE.WIDTH,
      SCREEN.VIEWPORT.PHONE.HEIGHT
    );
    await renderForm();
    await expect.element(roleRow(App.LAURA)).toBeVisible();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      window.innerWidth
    );
  });
});

describe("AddUser's picture", () => {
  it("asks for the picture right under the name", async () => {
    await renderForm();
    const form = page.getByRole("form", { name: t.title }).element();
    const labels = [...form.querySelectorAll("label")].map(
      ({ textContent }) => textContent
    );
    expect(labels.indexOf(FORM.avatar.label)).toBe(
      labels.indexOf(FORM.name) + 1
    );
  });

  it("a picture that was not saved says so and goes to the list: the User was added", async () => {
    const notSaved: AddUserState = { notice: USERS.ADD_NOTICE.AVATAR_FAILED };
    vi.mocked(addUser).mockResolvedValue(notSaved);
    await renderForm();
    await fill();
    await page.getByRole("button", { name: t.submit }).click();
    await expect
      .poll(() => vi.mocked(aofToast).mock.calls[0]?.[0])
      .toBe(t.avatarFailed);
    expect(replace).toHaveBeenCalledWith(BACK_OFFICE.PAGE.USERS);
  });
});
