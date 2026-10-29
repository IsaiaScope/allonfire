// @module-tag integration
import { objectValues } from "@allonfire/core/shared/utils/object";
import { App, GameType, Role } from "../../../../generated/prisma/enums";
import { prisma } from "../../prisma/client";
import { FIXTURE } from "../../seed/fixtures/fixtures";
import {
  accessUserById,
  createUser,
  deleteUsers,
  EmailTakenError,
  listUsers,
  readUser,
  sessionAlive,
  setUserImage,
  type UserListQuery,
  updateUser,
  userImages,
} from "../user.service";

// The Fixtures share this domain; other files in the run may add Users to
// it, so counts are "at least the Fixtures".
const FIXTURES = FIXTURE.DOMAIN;
/** A User made here, outside the Fixtures' domain so their counts hold. */
const MIXED = {
  email: "mixed-roles@list-users.test",
  memberships: [
    { app: App.LAURA, role: Role.ADMIN },
    { app: App.BACK_OFFICE, role: Role.VIEWER },
  ],
  name: "Mischa Rolando",
};
const MIXED_DOMAIN = "list-users.test";
/** Small, so the Fixtures span several pages. */
const PAGE_SIZE = 3;
const PAST_THE_END = 999;

const query = (overrides: Partial<UserListQuery> = {}): UserListQuery => ({
  page: 1,
  perPage: 100,
  text: FIXTURES,
  ...overrides,
});
const emailsOf = async (overrides: Partial<UserListQuery> = {}) =>
  (await listUsers(query(overrides))).users.map(({ email }) => email);

beforeAll(async () => {
  await prisma.user.create({
    data: {
      email: MIXED.email,
      memberships: { create: MIXED.memberships },
      name: MIXED.name,
    },
  });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: MIXED.email } });
});

describe("listUsers", () => {
  it("lists every User, one with no Membership too", async () => {
    const { total, users } = await listUsers(query());
    expect(total).toBe(users.length);
    expect(users.map(({ email }) => email)).toEqual(
      expect.arrayContaining(FIXTURE.USERS.map(({ email }) => email))
    );
  });

  it("matches an App and a Role on one Membership", async () => {
    const emails = await emailsOf({ app: [App.LAURA], role: [Role.ADMIN] });
    expect(emails).toEqual(
      expect.arrayContaining([
        FIXTURE.USER.LAURA.ADMIN.email,
        FIXTURE.USER.ADMIN_EVERYWHERE.email,
      ])
    );
    expect(emails).not.toContain(FIXTURE.USER.BACK_OFFICE.ADMIN.email);
    expect(emails).not.toContain(FIXTURE.USER.LAURA.VIEWER.email);
  });

  it("never pairs an App with a Role held in another App", async () => {
    const text = MIXED_DOMAIN;
    expect(
      await emailsOf({ app: [App.BACK_OFFICE], role: [Role.ADMIN], text })
    ).toEqual([]);
    expect(await emailsOf({ role: [Role.ADMIN], text })).toEqual([MIXED.email]);
  });

  it("matches any of the Apps and any of the Roles asked for", async () => {
    const text = MIXED_DOMAIN;
    expect(
      await emailsOf({
        app: [App.BACK_OFFICE, App.LAURA],
        role: [Role.VIEWER, Role.USER],
        text,
      })
    ).toEqual([MIXED.email]);
    expect(
      await emailsOf({ role: [Role.USER, Role.VIEWER], text: FIXTURES })
    ).toEqual(expect.arrayContaining([FIXTURE.USER.LAURA.VIEWER.email]));
  });

  it("asks nothing of an empty list", async () => {
    expect(await emailsOf({ app: [], role: [] })).toContain(
      FIXTURE.USER.NO_MEMBERSHIP.email
    );
  });

  it("matches exactly the Role asked for", async () => {
    const { users } = await listUsers(query({ role: [Role.USER] }));
    expect(users.length).toBeGreaterThan(0);
    for (const user of users) {
      expect(user.memberships.map(({ role }) => role)).toContain(Role.USER);
    }
  });

  it("leaves out a User with no Membership once an App is asked for", async () => {
    expect(await emailsOf({ app: [App.LAURA] })).not.toContain(
      FIXTURE.USER.NO_MEMBERSHIP.email
    );
  });

  it("finds part of an email, whatever its case", async () => {
    expect(await emailsOf({ text: "NO-MEMBERSHIP@" })).toEqual([
      FIXTURE.USER.NO_MEMBERSHIP.email,
    ]);
  });

  it("finds part of a name, whatever its case", async () => {
    expect(await emailsOf({ text: "mischa ROL" })).toEqual([MIXED.email]);
  });

  it("pages newest first in a stable order", async () => {
    const all = (await listUsers(query())).users;
    const pageNumbers = Array.from(
      { length: Math.ceil(all.length / PAGE_SIZE) },
      (_, index) => index + 1
    );
    const pages = (
      await Promise.all(
        pageNumbers.map((page) =>
          listUsers(query({ page, perPage: PAGE_SIZE }))
        )
      )
    ).flatMap(({ users }) => users.map(({ id }) => id));
    expect(pages).toEqual(all.map(({ id }) => id));
    expect(new Set(pages).size).toBe(pages.length);
    const sorted = [...all].sort(
      (a, b) =>
        b.createdAt.getTime() - a.createdAt.getTime() ||
        b.id.localeCompare(a.id)
    );
    expect(all.map(({ id }) => id)).toEqual(sorted.map(({ id }) => id));
  });

  it("answers a page past the end with no Users and the real total", async () => {
    const { total } = await listUsers(query());
    expect(await listUsers(query({ page: PAST_THE_END }))).toEqual({
      total,
      users: [],
    });
  });

  it("orders each User's Memberships as the App enum declares them", async () => {
    const [user] = (await listUsers(query({ text: MIXED_DOMAIN }))).users;
    const order = objectValues(App);
    expect(user?.memberships).toEqual(
      [...MIXED.memberships].sort(
        (a, b) => order.indexOf(a.app) - order.indexOf(b.app)
      )
    );
  });
});

// Users made for deletion live in their own domain, so the list's counts hold.
const DELETABLE = "delete-users.test";
const MISSING_ID = "missing-id";
const SIZE = 1;

/** A User holding something in every table a deletion reaches. */
const holder = (name: string) =>
  prisma.user.create({
    data: {
      accounts: {
        create: { accountId: name, providerId: "credential" },
      },
      email: `${name}@${DELETABLE}`,
      gameScores: { create: { gameType: GameType.MEMORY, score: SIZE } },
      images: {
        create: {
          alt: {},
          blurDataUrl: "",
          bytes: SIZE,
          height: SIZE,
          key: `${name}.avif`,
          width: SIZE,
        },
      },
      memberships: { create: { app: App.LAURA, role: Role.USER } },
      sessions: {
        create: { expiresAt: new Date(Date.now() + 60_000), token: name },
      },
    },
    select: { id: true, images: { select: { id: true } } },
  });

afterAll(async () => {
  await prisma.image.deleteMany({
    where: { key: { endsWith: ".avif", startsWith: "holder-" } },
  });
  await prisma.user.deleteMany({ where: { email: { endsWith: DELETABLE } } });
});

describe("deleteUsers", () => {
  it("deletes the Users named and everything they hold", async () => {
    const { id, images } = await holder("holder-all");
    expect(await deleteUsers([id])).toBe(1);
    const where = { where: { userId: id } };
    expect(await prisma.membership.count(where)).toBe(0);
    expect(await prisma.session.count(where)).toBe(0);
    expect(await prisma.account.count(where)).toBe(0);
    expect(await prisma.gameScore.count(where)).toBe(0);
    const image = await prisma.image.findUnique({
      where: { id: images[0]?.id ?? "" },
    });
    expect(image?.uploadedBy).toBeNull();
  });

  it("skips ids that do not exist", async () => {
    const { id } = await holder("holder-skip");
    expect(await deleteUsers([id, MISSING_ID])).toBe(1);
    expect(await deleteUsers([MISSING_ID])).toBe(0);
  });

  it("leaves every other User alone", async () => {
    const admin = await prisma.user.findUnique({
      where: { email: FIXTURE.USER.BACK_OFFICE.ADMIN.email },
    });
    expect(admin).not.toBeNull();
  });
});

describe("accessUserById", () => {
  it("reads a User's access fresh", async () => {
    const { id } = await holder("holder-access");
    expect(await accessUserById(id)).toEqual({
      memberships: [{ app: App.LAURA, role: Role.USER }],
    });
    await prisma.membership.update({
      data: { role: Role.VIEWER },
      where: { userId_app: { app: App.LAURA, userId: id } },
    });
    expect(await accessUserById(id)).toEqual({
      memberships: [{ app: App.LAURA, role: Role.VIEWER }],
    });
    await deleteUsers([id]);
    expect(await accessUserById(id)).toBeNull();
  });
});

// Users added here live in their own domain, so the list's counts hold.
const ADDED = "add-users.test";
const HASH = "hash";

describe("createUser", () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: ADDED } } });
  });

  it("creates the User, a credential Account and the Memberships", async () => {
    const { id } = await createUser(
      {
        email: `added@${ADDED}`,
        memberships: [{ app: App.LAURA, role: Role.USER }],
        name: "Added",
      },
      HASH
    );
    const user = await prisma.user.findUniqueOrThrow({
      include: { accounts: true, memberships: true },
      where: { id },
    });
    expect(user.emailVerified).toBe(true);
    expect(user.name).toBe("Added");
    expect(
      user.accounts.map(({ accountId, password, providerId }) => ({
        accountId,
        password,
        providerId,
      }))
    ).toEqual([{ accountId: id, password: HASH, providerId: "credential" }]);
    expect(user.memberships.map(({ app, role }) => ({ app, role }))).toEqual([
      { app: App.LAURA, role: Role.USER },
    ]);
  });

  it("creates a User in no App", async () => {
    const { id } = await createUser(
      { email: `nowhere@${ADDED}`, memberships: [], name: "Nowhere" },
      HASH
    );
    expect(await prisma.membership.count({ where: { userId: id } })).toBe(0);
  });

  it("refuses an email taken in another case, and writes nothing", async () => {
    await createUser(
      { email: ` Mixed@${ADDED} `, memberships: [], name: "First" },
      HASH
    );
    await expect(
      createUser(
        { email: `MiXeD@${ADDED}`, memberships: [], name: "Second" },
        HASH
      )
    ).rejects.toBeInstanceOf(EmailTakenError);
    expect(
      await prisma.user.count({ where: { email: `mixed@${ADDED}` } })
    ).toBe(1);
    expect(
      await prisma.account.count({
        where: { user: { email: `mixed@${ADDED}` } },
      })
    ).toBe(1);
  });
});

describe("a User's picture", () => {
  const PICTURED = "picture@set-user-image.test";
  const BARE = "bare@set-user-image.test";
  const FIRST = "avatar-u-first.avif";
  const SECOND = "avatar-u-second.avif";
  const BLUR = "data:image/webp;base64,AAAA";
  const pictureOf = async (id: string) =>
    await prisma.user.findUniqueOrThrow({
      select: { image: true, imageBlurDataUrl: true },
      where: { id },
    });
  let pictured = "";
  let bare = "";

  beforeAll(async () => {
    ({ id: pictured } = await prisma.user.create({
      data: { email: PICTURED, name: "Pictured" },
      select: { id: true },
    }));
    ({ id: bare } = await prisma.user.create({
      data: { email: BARE, name: "Bare" },
      select: { id: true },
    }));
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { endsWith: "@set-user-image.test" } },
    });
  });

  it("sets it with its blur, then replaces both, answering what it held before", async () => {
    expect(
      await setUserImage(pictured, { blurDataUrl: BLUR, image: FIRST })
    ).toEqual({ previous: null });
    expect(
      await setUserImage(pictured, { blurDataUrl: `${BLUR}2`, image: SECOND })
    ).toEqual({ previous: FIRST });
    expect(await pictureOf(pictured)).toEqual({
      image: SECOND,
      imageBlurDataUrl: `${BLUR}2`,
    });
  });

  // Each replaced file is answered once, so it is deleted once: two pictures
  // set at the same time never both answer the first and leave the loser's
  // file behind with no row pointing at it.
  it("answers each replaced file once when two pictures land together", async () => {
    const { id } = await prisma.user.create({
      data: { email: "together@set-user-image.test" },
      select: { id: true },
    });
    await setUserImage(id, { blurDataUrl: BLUR, image: FIRST });
    const answers = await Promise.all(
      ["a", "b", "c", "d"].map((tag) =>
        setUserImage(id, { blurDataUrl: BLUR, image: `${SECOND}-${tag}` })
      )
    );
    const previous = answers.map((answer) => answer?.previous);
    expect(new Set(previous).size).toBe(previous.length);
  });

  it("removing it clears its blur too", async () => {
    const { id } = await prisma.user.create({
      data: { email: "removed@set-user-image.test" },
      select: { id: true },
    });
    await setUserImage(id, { blurDataUrl: BLUR, image: FIRST });
    expect(await setUserImage(id, null)).toEqual({ previous: FIRST });
    expect(await pictureOf(id)).toEqual({
      image: null,
      imageBlurDataUrl: null,
    });
  });

  it("lists a User with their picture's blur", async () => {
    const { users } = await listUsers(query({ text: PICTURED }));
    expect(users.map(({ imageBlurDataUrl }) => imageBlurDataUrl)).toEqual([
      `${BLUR}2`,
    ]);
  });

  it("answers null for a User who does not exist", async () => {
    expect(
      await setUserImage("no-such-user", { blurDataUrl: BLUR, image: FIRST })
    ).toBeNull();
  });

  it("lists the pictures the Users named hold, skipping none and unknown ids", async () => {
    expect(await userImages([pictured, bare, "no-such-user"])).toEqual([
      SECOND,
    ]);
  });
});

// Users edited here live in their own domain, so the list's counts hold.
const EDITED = "edit-users.test";
const NEW_HASH = "new-hash";

describe("readUser and updateUser", () => {
  let count = 0;
  /** A User with a password, a Laura Membership and two Sessions. */
  const edited = async () => {
    count += 1;
    const { id } = await createUser(
      {
        email: `edited-${count}@${EDITED}`,
        memberships: [{ app: App.LAURA, role: Role.USER }],
        name: "Edited",
      },
      HASH
    );
    const sessions = await Promise.all(
      ["a", "b"].map((tag) =>
        prisma.session.create({
          data: {
            expiresAt: new Date(Date.now() + 60_000),
            token: `edit-${count}-${tag}`,
            userId: id,
          },
          select: { id: true },
        })
      )
    );
    return { id, sessions: sessions.map((session) => session.id) };
  };
  const passwordOf = async (userId: string) =>
    (
      await prisma.account.findFirst({
        where: { providerId: "credential", userId },
      })
    )?.password;
  const sessionsOf = (userId: string) =>
    prisma.session.findMany({ select: { id: true }, where: { userId } });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: EDITED } } });
  });

  it("reads one User with their Memberships", async () => {
    const { id } = await edited();
    expect(await readUser(id)).toMatchObject({
      id,
      memberships: [{ app: App.LAURA, role: Role.USER }],
      name: "Edited",
    });
  });

  it("answers null for an unknown id", async () => {
    expect(await readUser(MISSING_ID)).toBeNull();
  });

  it("renames, leaving the rest", async () => {
    const { id } = await edited();
    const after = await updateUser(id, { name: "Renamed" });
    expect(after?.name).toBe("Renamed");
    expect(after?.memberships).toEqual([{ app: App.LAURA, role: Role.USER }]);
    expect(await passwordOf(id)).toBe(HASH);
    expect(await sessionsOf(id)).toHaveLength(2);
  });

  it("replaces the Memberships with the set given", async () => {
    const { id } = await edited();
    await updateUser(id, {
      memberships: [{ app: App.BACK_OFFICE, role: Role.VIEWER }],
    });
    expect((await readUser(id))?.memberships).toEqual([
      { app: App.BACK_OFFICE, role: Role.VIEWER },
    ]);
  });

  it("sets the password on the credential Account and ends every Session", async () => {
    const { id } = await edited();
    await updateUser(id, { hashedPassword: NEW_HASH });
    expect(await passwordOf(id)).toBe(NEW_HASH);
    expect(await sessionsOf(id)).toHaveLength(0);
  });

  it("keeps the Session named in keepSessionId", async () => {
    const { id, sessions } = await edited();
    await updateUser(
      id,
      { hashedPassword: NEW_HASH },
      { keepSessionId: sessions[0] }
    );
    expect(await sessionsOf(id)).toEqual([{ id: sessions[0] }]);
  });

  it("creates the credential Account for a User who has none", async () => {
    const { id } = await prisma.user.create({
      data: {
        accounts: { create: { accountId: "google-sub", providerId: "google" } },
        email: `google@${EDITED}`,
      },
      select: { id: true },
    });
    await updateUser(id, { hashedPassword: NEW_HASH });
    const credentials = await prisma.account.findMany({
      where: { providerId: "credential", userId: id },
    });
    expect(
      credentials.map(({ accountId, password }) => ({ accountId, password }))
    ).toEqual([{ accountId: id, password: NEW_HASH }]);
  });

  it("leaves Sessions alone without a password", async () => {
    const { id } = await edited();
    await updateUser(id, { memberships: [] });
    expect(await sessionsOf(id)).toHaveLength(2);
  });

  it("answers null and writes nothing for an unknown id", async () => {
    expect(await updateUser(MISSING_ID, { name: "Nobody" })).toBeNull();
    expect(await prisma.user.count({ where: { id: MISSING_ID } })).toBe(0);
  });
});

describe("sessionAlive", () => {
  const OWNER = `session-owner@${EDITED}`;
  const sessionOf = async (token: string, expiresInMs: number) => {
    const { id: userId } = await prisma.user.upsert({
      create: { email: OWNER },
      select: { id: true },
      update: {},
      where: { email: OWNER },
    });
    return prisma.session.create({
      data: { expiresAt: new Date(Date.now() + expiresInMs), token, userId },
      select: { id: true },
    });
  };

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: OWNER } });
  });

  it("is true for a live Session", async () => {
    const { id } = await sessionOf("alive-live", 60_000);
    expect(await sessionAlive(id)).toBe(true);
  });

  it("is false once deleted", async () => {
    const { id } = await sessionOf("alive-deleted", 60_000);
    await prisma.session.delete({ where: { id } });
    expect(await sessionAlive(id)).toBe(false);
  });

  it("is false once expired", async () => {
    const { id } = await sessionOf("alive-expired", -1000);
    expect(await sessionAlive(id)).toBe(false);
  });
});
