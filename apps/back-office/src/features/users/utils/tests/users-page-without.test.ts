// @module-tag unit
import { USERS_PAGE } from "@/shared/tests/msw/handlers";
import { usersPageWithout } from "../users-page-without";

const [LAURA, NONE] = USERS_PAGE.users;
const MORE = { ...USERS_PAGE, pageCount: 2, total: 12 };

describe("usersPageWithout", () => {
  it("drops the named Users and lowers the total", () => {
    expect(usersPageWithout(MORE, new Set([LAURA?.id ?? ""]), 10)).toEqual({
      ...MORE,
      pageCount: 2,
      total: 11,
      users: [NONE],
    });
  });

  it("lowers the page count when a page is no longer needed", () => {
    expect(
      usersPageWithout(
        { ...USERS_PAGE, pageCount: 2, total: 11 },
        new Set([LAURA?.id ?? ""]),
        10
      ).pageCount
    ).toBe(1);
  });

  it("changes nothing when no named User is on the page", () => {
    expect(usersPageWithout(MORE, new Set(["absent"]), 10)).toEqual(MORE);
  });

  it("keeps the page as it is when it would empty while Users remain elsewhere", () => {
    expect(
      usersPageWithout(MORE, new Set(USERS_PAGE.users.map(({ id }) => id)), 10)
    ).toBe(MORE);
  });

  it("empties the page when those were the last Users", () => {
    expect(
      usersPageWithout(
        USERS_PAGE,
        new Set(USERS_PAGE.users.map(({ id }) => id)),
        10
      )
    ).toEqual({ ...USERS_PAGE, pageCount: 1, total: 0, users: [] });
  });
});
