// @module-tag integration

import { LOCAL } from "@allonfire/config/local/addresses";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import { createUser } from "@allonfire/database/features/auth/user.service";
import { prisma } from "@allonfire/database/features/prisma/client";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { AUTH } from "../../../shared/constants/auth";
import { HOST_AUTH_PATH } from "../../../shared/tests/stub-auth";
import { createAuth } from "../auth";
import type { AuthMail } from "../utils/mail-options";

const BASE_URL = LOCAL.URL.API;
const ORIGIN = LOCAL.URL.LAURA;
const RESET_PAGE = `${ORIGIN}/reset-password`;
const EMAIL_DOMAIN = "@mail.allonfire.test";

type Sent =
  | { kind: "verification"; email: string; url: string }
  | { kind: "reset"; email: string; token: string; redirectTo: string | null };

/** The host's mail as the module sees it: every request recorded, none sent. */
const fakeMail = () => {
  const sent: Sent[] = [];
  const state: { hold: boolean; ready: boolean } = { hold: false, ready: true };
  const mail: AuthMail = {
    ready: () => Promise.resolve(state.ready),
    sendPasswordReset: ({ email, redirectTo, token }) => {
      sent.push({ email, kind: "reset", redirectTo, token });
      return state.hold ? new Promise(() => undefined) : Promise.resolve();
    },
    sendVerification: ({ email, url }) => {
      sent.push({ email, kind: "verification", url });
      return Promise.resolve();
    },
  };
  return { mail, sent, state };
};

const { mail, sent, state } = fakeMail();
const auth = createAuth({
  basePath: HOST_AUTH_PATH,
  baseURL: BASE_URL,
  mail,
  secret: "x".repeat(32),
  trustedOrigins: [ORIGIN],
});

const codeBody = z.object({ code: z.string() });

let sequence = 0;
const nextEmail = () => {
  sequence += 1;
  return `user-${Date.now()}-${sequence}${EMAIL_DOMAIN}`;
};

const addUser = async (requireVerification: boolean) => {
  const email = nextEmail();
  const { id } = await createUser(
    { email, memberships: [], name: "Mail", requireVerification },
    await hashPassword(FIXTURE.PASSWORD)
  );
  return { email, id };
};

const call = (path: string, init: { method?: string; body?: object } = {}) =>
  auth.handler(
    new Request(`${BASE_URL}${HOST_AUTH_PATH}${path}`, {
      headers: {
        [HTTP.HEADER.CONTENT_TYPE]: HTTP.CONTENT_TYPE.JSON,
        [HTTP.HEADER.ORIGIN]: ORIGIN,
      },
      method: init.method ?? HTTP.METHOD.POST,
      ...(init.body && { body: stringifyJson(init.body) }),
    })
  );

const signIn = (email: string) =>
  call(AUTH.PATH.SIGN_IN_EMAIL, {
    body: { email, password: FIXTURE.PASSWORD },
  });

/** Lets the module's background sends run. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

const sentTo = (email: string) => sent.filter((one) => one.email === email);

/** Signs `email` in with the right password and answers the verification link it was sent. */
const linkSentTo = async (email: string) => {
  await signIn(email);
  await settle();
  const [one] = sentTo(email);
  return new URL(one?.kind === "verification" ? one.url : "");
};

/** Opens a verification link at the module. */
const openLink = (link: URL) =>
  call(`${AUTH.PATH.VERIFY_EMAIL}${link.search}`, { method: HTTP.METHOD.GET });

beforeEach(() => {
  sent.length = 0;
  state.hold = false;
  state.ready = true;
});

afterAll(async () => {
  await prisma.user.deleteMany({
    where: { email: { endsWith: EMAIL_DOMAIN } },
  });
});

describe("verification", () => {
  it("refuses an unverified User's sign-in and sends them a link", async () => {
    const { email } = await addUser(true);
    const res = await signIn(email);
    expect(res.status).toBe(HTTP.STATUS.FORBIDDEN);
    await settle();
    const [one] = sentTo(email);
    expect(one?.kind).toBe("verification");
    expect(one?.kind === "verification" && one.url).toContain(
      AUTH.PATH.VERIFY_EMAIL
    );
  });

  it("signs a verified User in and sends nothing", async () => {
    const { email } = await addUser(false);
    expect((await signIn(email)).status).toBe(HTTP.STATUS.OK);
    await settle();
    expect(sentTo(email)).toEqual([]);
  });

  it("verifies through a link issued after the last requirement", async () => {
    const { email, id } = await addUser(true);
    const res = await openLink(await linkSentTo(email));
    // Back to the link's callback, with no error.
    expect(res.status).toBe(HTTP.STATUS.FOUND);
    expect(res.headers.get(HTTP.HEADER.LOCATION)).not.toContain("error=");
    const user = await prisma.user.findUniqueOrThrow({ where: { id } });
    expect(user.emailVerified).toBe(true);
  });

  it("refuses a link issued before an Admin required verification again", async () => {
    const { email, id } = await addUser(true);
    const link = await linkSentTo(email);
    // The Admin requires it again after the link went out.
    await prisma.user.update({
      data: {
        emailVerified: false,
        verificationRequiredAt: new Date(Date.now() + UNIT.MS_PER_MINUTE),
      },
      where: { id },
    });
    const res = await openLink(link);
    expect(res.status).toBe(HTTP.STATUS.FOUND);
    expect(res.headers.get(HTTP.HEADER.LOCATION)).toContain("error=");
    const user = await prisma.user.findUniqueOrThrow({ where: { id } });
    expect(user.emailVerified).toBe(false);
  });
});

describe("password reset", () => {
  const request = (email: string) =>
    call(AUTH.PATH.REQUEST_PASSWORD_RESET, {
      body: { email, redirectTo: RESET_PAGE },
    });

  it("answers an unknown address as it answers a known one, sending only to the known", async () => {
    const { email } = await addUser(false);
    const known = await request(email);
    const unknown = await request(nextEmail());
    expect(unknown.status).toBe(known.status);
    expect(await unknown.json()).toEqual(await known.json());
    await settle();
    expect(sent).toEqual([
      {
        email,
        kind: "reset",
        redirectTo: RESET_PAGE,
        token: expect.any(String),
      },
    ]);
  });

  it("answers before the email is handed over", async () => {
    const { email } = await addUser(false);
    state.hold = true;
    expect((await request(email)).status).toBe(HTTP.STATUS.OK);
  });

  it("sets the new password and ends every Session of the User", async () => {
    const { email, id } = await addUser(false);
    expect((await signIn(email)).status).toBe(HTTP.STATUS.OK);
    await request(email);
    await settle();
    const [one] = sentTo(email);
    const res = await call(AUTH.PATH.RESET_PASSWORD, {
      body: {
        newPassword: FIXTURE.NEW_PASSWORD,
        token: one?.kind === "reset" ? one.token : "",
      },
    });
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(await prisma.session.count({ where: { userId: id } })).toBe(0);
  });

  it("refuses a new password that misses a rule, keeping the token and every Session", async () => {
    const { email, id } = await addUser(false);
    await signIn(email);
    await request(email);
    await settle();
    const [one] = sentTo(email);
    const token = one?.kind === "reset" ? one.token : "";
    // Long enough for Better Auth's own check, no capital, digit or symbol.
    const weak = await call(AUTH.PATH.RESET_PASSWORD, {
      body: { newPassword: "aaaaaaaaaaaa", token },
    });
    expect(weak.status).toBe(HTTP.STATUS.BAD_REQUEST);
    expect(codeBody.parse(await weak.json()).code).toBe(
      AUTH.ERROR_CODE.PASSWORD_WEAK
    );
    expect(await prisma.session.count({ where: { userId: id } })).toBe(1);
    const strong = await call(AUTH.PATH.RESET_PASSWORD, {
      body: { newPassword: FIXTURE.NEW_PASSWORD, token },
    });
    expect(strong.status).toBe(HTTP.STATUS.OK);
  });

  it("ends no Session when the token is wrong", async () => {
    const { email, id } = await addUser(false);
    await signIn(email);
    const res = await call(AUTH.PATH.RESET_PASSWORD, {
      body: { newPassword: FIXTURE.NEW_PASSWORD, token: "not-a-token" },
    });
    expect(res.status).toBe(HTTP.STATUS.BAD_REQUEST);
    expect(await prisma.session.count({ where: { userId: id } })).toBe(1);
  });
});

describe("while the per-address limit cannot count", () => {
  it.each(AUTH.MAIL.SENDING_PATHS)(
    "refuses %s for any address, sending nothing",
    async (path) => {
      const { email } = await addUser(false);
      state.ready = false;
      const known = await call(path, {
        body: { email, redirectTo: RESET_PAGE },
      });
      const unknown = await call(path, {
        body: { email: nextEmail(), redirectTo: RESET_PAGE },
      });
      expect(known.status).toBe(HTTP.STATUS.SERVICE_UNAVAILABLE);
      expect(codeBody.parse(await known.json()).code).toBe(
        AUTH.ERROR_CODE.MAIL_UNAVAILABLE
      );
      expect(unknown.status).toBe(known.status);
      await settle();
      expect(sent).toEqual([]);
    }
  );
});
