// @module-tag integration

import { USER } from "@allonfire/auth/features/users/constants/users";
import { App } from "@allonfire/database/enums";
import { page, userEvent } from "vitest/browser";
import { APP_ENTRY } from "@/shared/constants/apps";
import {
  listAsked,
  listControls,
  renderList,
  setUpDesktopToday,
} from "@/shared/tests/list-sort-view-harness";
import { USERS_PAGE, USERS_URL } from "@/shared/tests/msw/handlers";
import { enT } from "@/shared/tests/translators";
import { UsersTable } from "../users-table";

// A server action: covered for real by e2e.
vi.mock("../../actions/delete-users", () => ({ deleteUsers: vi.fn() }));
vi.mock(
  "@/features/i18n/navigation",
  () => import("@allonfire/ui/shared/tests/navigation-mock")
);
// An App's mark (a User's card) only needs an element there.
vi.mock(
  "@allonfire/ui/shared/components/aof-image",
  () => import("@allonfire/ui/shared/tests/aof-image-mock")
);

const LAURA = APP_ENTRY[App.LAURA].name;
const { header } = listControls(/^Filters/);
const render = (search = "") =>
  renderList({
    children: <UsersTable selfId="" />,
    list: enT("Users.list"),
    search,
  });

setUpDesktopToday();

describe("UsersTable column menus", () => {
  it("gives an App's column Hide only, Email Sort only, Created both", async () => {
    await render();
    const hide = page.getByRole("menuitemcheckbox", {
      name: enT("List.column.hide"),
    });
    const asc = page.getByRole("menuitemcheckbox", {
      name: enT("List.column.asc"),
    });
    await userEvent.click(header(LAURA));
    await expect.element(hide).toBeVisible();
    await expect.element(asc).not.toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await userEvent.click(header(enT("Users.column.email")));
    await expect.element(asc).toBeVisible();
    await expect.element(hide).not.toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await userEvent.click(header(enT("Users.column.created")));
    await expect.element(asc).toBeVisible();
    await expect.element(hide).toBeVisible();
  });

  it("opens a hand-edited address: what is unknown is dropped, the rest applies", async () => {
    const asked = listAsked(USERS_URL, USERS_PAGE);
    await render(
      `?${USER.PARAM.SORT}=bogus.up,email.desc&${USER.PARAM.HIDE}=NOPE,${App.LAURA}`
    );
    await expect
      .poll(() => asked.at(-1)?.get(USER.PARAM.SORT))
      .toBe("email.desc");
    await expect
      .element(page.getByRole("columnheader", { name: LAURA }))
      .not.toBeInTheDocument();
  });
});
