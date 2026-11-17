// @module-tag integration

import type { UserBody } from "@allonfire/auth/features/users/hono/constants/schemas";
import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { App, Role } from "@allonfire/database/enums";
import { page } from "vitest/browser";
import { FORM_WIDTHS, heightAt } from "@/shared/tests/height-at";
import { renderInApp } from "@/shared/tests/render-in-app";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import { replace } from "../../tests/user-form-mocks";
import { EditUser } from "../edit-user";
import { EditUserSkeleton } from "../edit-user-skeleton";

// jscpd:ignore-start
vi.mock("../../actions/edit-user", () => ({ editUser: vi.fn() }));
vi.mock(
  "@/features/i18n/navigation",
  () => import("../../tests/user-form-mocks")
);
vi.mock(
  "@allonfire/ui/shared/components/aof-image",
  () => import("../../tests/user-form-mocks")
);
// jscpd:ignore-end

const USER: UserBody = {
  createdAt: "2026-10-02T10:00:00.000Z",
  email: "someone@edit-user-skeleton.test",
  emailVerified: true,
  id: "user-2",
  image: null,
  imageBlurDataUrl: null,
  memberships: [{ app: App.BACK_OFFICE, role: Role.ADMIN }],
  name: "Someone",
  version: "version-1",
};

beforeEach(() => {
  replace.mockClear();
  return page.viewport(
    SCREEN.VIEWPORT.DESKTOP.WIDTH,
    SCREEN.VIEWPORT.DESKTOP.HEIGHT
  );
});

describe("EditUserSkeleton", () => {
  it.each(FORM_WIDTHS)(
    "is as tall as the Edit User form on %s, so nothing moves when the User arrives",
    async (_, width) => {
      const real = await heightAt(
        width,
        <EditUser manageApp={App.BACK_OFFICE} selfId="me" user={USER} />
      );
      await expect
        .element(page.getByRole("form", { name: USER.email }))
        .toBeVisible();
      const skeleton = await heightAt(width, <EditUserSkeleton />);
      expect(skeleton).toBeCloseTo(real ?? 0, 0);
    }
  );

  it("says the page is loading, without its parts being read", async () => {
    await renderInApp({ children: <EditUserSkeleton /> });
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent(EN.Users.edit.loading);
    expect(document.querySelector('[data-skeleton="form"]')).toHaveAttribute(
      "aria-busy",
      "true"
    );
  });
});
