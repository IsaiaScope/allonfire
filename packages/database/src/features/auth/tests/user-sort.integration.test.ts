// @module-tag integration
import { App, Role } from "../../../../generated/prisma/enums";
import { prisma } from "../../prisma/client";
import { listUsers, type UserListQuery } from "../user.service";

// Rows live under their own domain: the Fixtures' and list-users' counts hold.
const DOMAIN = "sort-users.test";
const emailOf = (name: string) => `${name}@${DOMAIN}`;

const list = (extra: Partial<UserListQuery> = {}) =>
  listUsers({ page: 1, perPage: 100, text: DOMAIN, ...extra });
const emailsOf = async (extra: Partial<UserListQuery> = {}) =>
  (await list(extra)).users.map(({ email }) => email);

/** Users made at the given instants, named by their position. */
const makeUsers = (names: string[], createdAt: string[] = []) =>
  prisma.$transaction(
    names.map((name, at) =>
      prisma.user.create({
        data: {
          createdAt: new Date(createdAt[at] ?? "2026-06-01T00:00:00.000Z"),
          email: emailOf(name),
          id: `sort-users-${name}`,
          memberships: { create: [{ app: App.LAURA, role: Role.USER }] },
          name,
        },
      })
    )
  );

beforeEach(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
  await prisma.$disconnect();
});

describe("listUsers sort", () => {
  it("orders by Email, up or down", async () => {
    await makeUsers(["bea", "ada", "cy"]);
    expect(
      await emailsOf({ sort: [{ column: "email", direction: "asc" }] })
    ).toEqual([emailOf("ada"), emailOf("bea"), emailOf("cy")]);
    expect(
      await emailsOf({ sort: [{ column: "email", direction: "desc" }] })
    ).toEqual([emailOf("cy"), emailOf("bea"), emailOf("ada")]);
  });

  it("orders by Created, and newest first with no sort", async () => {
    await makeUsers(
      ["old", "new", "mid"],
      [
        "2026-01-01T00:00:00.000Z",
        "2026-03-01T00:00:00.000Z",
        "2026-02-01T00:00:00.000Z",
      ]
    );
    expect(
      await emailsOf({ sort: [{ column: "created", direction: "asc" }] })
    ).toEqual([emailOf("old"), emailOf("mid"), emailOf("new")]);
    expect(await emailsOf({ sort: [] })).toEqual([
      emailOf("new"),
      emailOf("mid"),
      emailOf("old"),
    ]);
    expect(await emailsOf()).toEqual([
      emailOf("new"),
      emailOf("mid"),
      emailOf("old"),
    ]);
  });

  it("never repeats or skips a User across pages when Created ties", async () => {
    const names = ["a", "b", "c", "d", "e", "f", "g"];
    await makeUsers(names);
    const sort = [{ column: "created", direction: "asc" }] as const;
    const whole = await emailsOf({ sort });
    expect(new Set(whole).size).toBe(names.length);
    const paged = (
      await Promise.all(
        Array.from({ length: Math.ceil(names.length / 2) }, (_, at) =>
          emailsOf({ page: at + 1, perPage: 2, sort })
        )
      )
    ).flat();
    expect(paged).toEqual(whole);
  });
});

describe("listUsers range", () => {
  it("keeps the Users of a range, both days included, to the millisecond", async () => {
    await makeUsers(
      ["before", "first", "last", "after"],
      [
        "2026-11-25T23:59:59.999Z",
        "2026-11-26T00:00:00.000Z",
        "2026-11-28T23:59:59.999Z",
        "2026-11-29T00:00:00.000Z",
      ]
    );
    expect(
      await emailsOf({
        created: { from: "2026-11-26", to: "2026-11-28" },
        sort: [{ column: "created", direction: "asc" }],
      })
    ).toEqual([emailOf("first"), emailOf("last")]);
  });

  it("composes with the App, the Role and the text, and the total follows", async () => {
    await makeUsers(
      ["in", "out"],
      ["2026-11-27T10:00:00.000Z", "2026-12-05T10:00:00.000Z"]
    );
    const day = { from: "2026-11-27", to: "2026-11-27" };
    const found = await list({
      app: [App.LAURA],
      created: day,
      role: [Role.USER],
    });
    expect(found.users.map(({ email }) => email)).toEqual([emailOf("in")]);
    expect(found.total).toBe(1);
    expect(await emailsOf({ app: [App.BACK_OFFICE], created: day })).toEqual(
      []
    );
    expect(await emailsOf({ created: day, text: "nobody" })).toEqual([]);
  });
});
