// @module-tag integration

import type { UserBody } from "@allonfire/auth/features/users/hono/constants/schemas";
import { DATE } from "@allonfire/core/features/i18n/constants/dates";
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { App } from "@allonfire/database/enums";
import { aofToast } from "@allonfire/ui/shared/hooks/use-aof-toast";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import { replace } from "../../tests/user-form-mocks";
import { AddUser } from "../add-user";
import { EditUser } from "../edit-user";

vi.mock("../../actions/add-user", () => ({ addUser: vi.fn() }));
vi.mock("../../actions/edit-user", () => ({ editUser: vi.fn() }));
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

/** The words both User forms share. */
const FORM = EN.Users.form;
const USER: UserBody = {
  createdAt: "2026-10-02T10:00:00.000Z",
  email: "shared@user-form-parts.test",
  emailVerified: true,
  id: "user-2",
  image: null,
  imageBlurDataUrl: null,
  memberships: [],
  name: "Shared",
  version: "version-1",
};

const renderIn = (children: ReactNode) =>
  render(
    <NextIntlClientProvider
      formats={DATE.FORMATS}
      locale={I18N.DEFAULT_LANGUAGE}
      messages={EN}
      timeZone={DATE.TIME_ZONE}
    >
      {children}
    </NextIntlClientProvider>
  );

/** Whether the page shows these words, once or more. */
const shows = (text: string) =>
  page.getByText(text, { exact: true }).elements().length > 0;

/** What a User form shows of the shared parts, read from its page. */
const sharedParts = (password: string, confirmPassword: string) => {
  const name = page.getByLabelText(FORM.name, { exact: true });
  return {
    avatar: shows(FORM.avatar.label),
    confirmRequired: page
      .getByLabelText(confirmPassword, { exact: true })
      .element()
      .hasAttribute("required"),
    name: name.element().getAttribute("name"),
    nameRequired: name.element().hasAttribute("required"),
    password: page
      .getByLabelText(password, { exact: true })
      .element()
      .getAttribute("name"),
    passwordRequired: page
      .getByLabelText(password, { exact: true })
      .element()
      .hasAttribute("required"),
    reveals: page.getByRole("button", { name: FORM.showPassword }).elements()
      .length,
    roles: shows(FORM.roles),
    rules: shows(EN.Password.rules),
  };
};

beforeEach(() => {
  vi.mocked(aofToast).mockReset();
  replace.mockReset();
});

describe("the User forms' shared parts", () => {
  it("NameField, AvatarField and PasswordFields render the same fields in both forms, labelled from Users.form", async () => {
    const add = await renderIn(<AddUser />);
    const inAdd = sharedParts(FORM.password, FORM.confirmPassword);
    await add.unmount();
    await renderIn(
      <EditUser manageApp={App.BACK_OFFICE} selfId="user-self" user={USER} />
    );
    const inEdit = sharedParts(
      EN.Users.edit.password,
      EN.Users.edit.confirmPassword
    );
    const fields = {
      avatar: true,
      name: "name",
      password: "password",
      reveals: 2,
      roles: true,
      rules: true,
    };
    expect(inAdd).toEqual({
      ...fields,
      confirmRequired: true,
      nameRequired: true,
      passwordRequired: true,
    });
    // Edit keeps a password unless one is typed: neither field is required.
    expect(inEdit).toEqual({
      ...fields,
      confirmRequired: false,
      nameRequired: true,
      passwordRequired: false,
    });
  });
});
