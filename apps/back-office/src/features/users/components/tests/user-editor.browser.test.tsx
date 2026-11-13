// @module-tag integration

import { worker } from "@allonfire/config/tests/browser/msw";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { App } from "@allonfire/database/enums";
import { HttpResponse, http } from "msw";
import { notFound } from "next/navigation";
import { page } from "vitest/browser";
import { USERS_PAGE, USERS_URL } from "@/shared/tests/msw/handlers";
import { renderInApp } from "@/shared/tests/render-in-app";
import { replace } from "../../tests/user-form-mocks";
import { UserEditor } from "../user-editor";

vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
vi.mock("../../actions/edit-user", () => ({ editUser: vi.fn() }));
vi.mock(
  "@/features/i18n/navigation",
  () => import("../../tests/user-form-mocks")
);
vi.mock(
  "@allonfire/ui/shared/components/aof-image",
  () => import("../../tests/user-form-mocks")
);

const [LAURA_ADMIN] = USERS_PAGE.users;
const ID = LAURA_ADMIN?.id ?? "";

beforeEach(() => {
  replace.mockClear();
  vi.mocked(notFound).mockClear();
});

const editor = () =>
  renderInApp({
    children: <UserEditor id={ID} manageApp={App.BACK_OFFICE} selfId="me" />,
  });

describe("UserEditor", () => {
  it("reads the User from the API and opens the form on them", async () => {
    worker.use(
      http.get(`${USERS_URL}/${ID}`, () => HttpResponse.json(LAURA_ADMIN))
    );
    editor();
    await expect
      .element(page.getByRole("heading", { name: LAURA_ADMIN?.email ?? "" }))
      .toBeVisible();
  });

  it("is the 404 for a User the API does not know", async () => {
    worker.use(
      http.get(`${USERS_URL}/${ID}`, () =>
        HttpResponse.json({}, { status: HTTP.STATUS.NOT_FOUND })
      )
    );
    editor();
    await vi.waitFor(() => expect(notFound).toHaveBeenCalled());
  });
});
