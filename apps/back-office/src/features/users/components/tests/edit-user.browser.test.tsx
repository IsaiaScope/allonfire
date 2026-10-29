// @module-tag integration

import type { UserBody } from "@allonfire/auth/features/users/hono/constants/schemas";
import { DATE } from "@allonfire/core/features/i18n/constants/dates";
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { App, Role } from "@allonfire/database/enums";
import { aofToast } from "@allonfire/ui/lib/use-aof-toast";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { APP_ENTRY } from "@/shared/constants/apps";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import { type EditUserState, editUser } from "../../actions/edit-user";
import { USERS } from "../../constants/users";
import { EditUser } from "../edit-user";

vi.mock("../../actions/edit-user", () => ({ editUser: vi.fn() }));
const replace = vi.fn();
vi.mock("@/features/i18n/navigation", () => ({
  Link: ({ children, ...props }: { children: ReactNode; href: string }) => (
    <a {...props}>{children}</a>
  ),
  useRouter: () => ({ replace }),
}));
vi.mock("@allonfire/ui/lib/use-aof-toast", async (original) => ({
  ...(await original<typeof import("@allonfire/ui/lib/use-aof-toast")>()),
  aofToast: vi.fn(),
}));
// next/image reaches the browser as a CommonJS object, not a component.
vi.mock("@allonfire/ui/components/aof-image", () => ({
  AOFImage: ({ src }: { src: string }) => <span data-src={src} />,
}));

const t = EN.Users.edit;
const SELF_ID = "user-self";
const NAME = "Edited";
const USER: UserBody = {
  createdAt: "2026-10-02T10:00:00.000Z",
  email: "edited@edit-user.test",
  id: "user-2",
  image: null,
  imageBlurDataUrl: null,
  memberships: [
    { app: App.BACK_OFFICE, role: Role.ADMIN },
    { app: App.LAURA, role: Role.VIEWER },
  ],
  name: NAME,
};
const roleRow = (app: App) =>
  page.getByRole("radiogroup", {
    name: EN.Users.add.role.replace("{app}", APP_ENTRY[app].name),
  });
const lockedNote = t.ownRoleLocked.replace(
  "{app}",
  APP_ENTRY[App.BACK_OFFICE].name
);

const renderForm = (user = USER) =>
  render(
    <NextIntlClientProvider
      formats={DATE.FORMATS}
      locale={I18N.DEFAULT_LANGUAGE}
      messages={EN}
      timeZone={DATE.TIME_ZONE}
    >
      <EditUser manageApp={App.BACK_OFFICE} selfId={SELF_ID} user={user} />
    </NextIntlClientProvider>
  );
const save = () => page.getByRole("button", { name: t.submit }).click();
const posted = () => vi.mocked(editUser).mock.calls[0]?.[2];

beforeEach(() => {
  vi.mocked(editUser).mockReset();
  vi.mocked(aofToast).mockReset();
  replace.mockReset();
  return page.viewport(
    SCREEN.VIEWPORT.DESKTOP.WIDTH,
    SCREEN.VIEWPORT.DESKTOP.HEIGHT
  );
});

describe("EditUser", () => {
  it("opens on the User: headed by their email, shown in a field nobody can reach, their name and Roles", async () => {
    await renderForm();
    await expect
      .element(page.getByRole("heading", { name: USER.email }))
      .toBeVisible();
    const email = page.getByRole("textbox", { name: t.email });
    await expect.element(email).toHaveValue(USER.email);
    await expect.element(email).toBeDisabled();
    expect(email.element().getAttribute("name")).toBeNull();
    await expect
      .element(page.getByLabelText(EN.Users.add.name, { exact: true }))
      .toHaveValue(NAME);
    await expect
      .element(
        roleRow(App.LAURA).getByRole("button", {
          name: EN.Navigation.role[Role.VIEWER],
        })
      )
      .toHaveAttribute("aria-current", "page");
  });

  it("keeps a long email within a phone's width", async () => {
    await page.viewport(
      SCREEN.VIEWPORT.PHONE.WIDTH,
      SCREEN.VIEWPORT.PHONE.HEIGHT
    );
    await renderForm({
      ...USER,
      email: `a-very-long-address-that-runs-past-a-phone-${"x".repeat(40)}@e2e.test`,
    });
    await expect
      .element(page.getByRole("textbox", { name: t.email }))
      .toBeVisible();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      window.innerWidth
    );
  });

  it("is headed by the email when the User has no name too", async () => {
    await renderForm({ ...USER, name: null });
    await expect
      .element(page.getByRole("heading", { name: USER.email }))
      .toBeVisible();
  });

  it("on your own page the Back Office row is locked with its note and still posts its Role", async () => {
    vi.mocked(editUser).mockResolvedValue({});
    await renderForm({ ...USER, id: SELF_ID });
    await expect.element(page.getByText(lockedNote)).toBeVisible();
    await expect
      .element(roleRow(App.BACK_OFFICE))
      .toHaveAttribute("aria-disabled", "true");
    await save();
    await expect.poll(() => vi.mocked(editUser).mock.calls.length).toBe(1);
    expect(posted()?.get(`roles.${App.BACK_OFFICE}`)).toBe(Role.ADMIN);
  });

  it("another User's page has no locked row", async () => {
    await renderForm();
    await expect.element(roleRow(App.BACK_OFFICE)).toBeVisible();
    expect(page.getByText(lockedNote).query()).toBeNull();
  });

  it("posts no password when both fields stay empty", async () => {
    vi.mocked(editUser).mockResolvedValue({});
    await renderForm();
    await save();
    await expect.poll(() => vi.mocked(editUser).mock.calls.length).toBe(1);
    expect(posted()?.get("password")).toBe("");
  });

  it("a SAVED answer toasts and opens the list", async () => {
    const saved: EditUserState = { notice: USERS.EDIT_NOTICE.SAVED };
    vi.mocked(editUser).mockResolvedValue(saved);
    await renderForm();
    await save();
    await expect.poll(() => replace.mock.calls.length).toBe(1);
    expect(aofToast).toHaveBeenCalledWith(t.saved, "success");
    expect(replace).toHaveBeenCalledWith(BACK_OFFICE.PAGE.USERS);
  });

  it("a picture refused toasts a warning and opens the list", async () => {
    const failed: EditUserState = { notice: USERS.EDIT_NOTICE.AVATAR_FAILED };
    vi.mocked(editUser).mockResolvedValue(failed);
    await renderForm();
    await save();
    await expect.poll(() => replace.mock.calls.length).toBe(1);
    expect(aofToast).toHaveBeenCalledWith(t.avatarFailed, "warning");
  });

  it("a GONE answer shows the alert and stays", async () => {
    const gone: EditUserState = { error: USERS.EDIT_ERROR.GONE };
    vi.mocked(editUser).mockResolvedValue(gone);
    await renderForm();
    await save();
    await expect.element(page.getByText(t.error.gone)).toBeVisible();
    expect(replace).not.toHaveBeenCalled();
  });
});
