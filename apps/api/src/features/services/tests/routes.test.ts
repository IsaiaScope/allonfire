// @module-tag unit
import { sessionFor } from "@allonfire/auth/shared/tests/stub-auth";
import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { MAIL } from "@allonfire/core/features/mail/constants/mail";
import { ResourceChangedError } from "@allonfire/core/features/version/utils/resource-changed-error";
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import { fillPath } from "@allonfire/core/shared/utils/route-path";
import { ServiceType } from "@allonfire/database/enums";
import { ProviderIncompleteError } from "@allonfire/database/features/service/provider.service";
import { createApp } from "../../../app";
import { API } from "../../../shared/constants/api";
import { apiAuth, appDeps } from "../../../shared/tests/app-deps";
import { problemOf } from "../../../shared/tests/problem-of";
import { SERVICES } from "../constants/services";
import type { ServicesDeps } from "../utils/deps";
import { stubServicesDeps } from "./stub-services-deps";

const TOKEN = "k".repeat(40);
const ADMIN_EMAIL = "admin@services.test";
const KEY_VALUE = "never-answered";
const USAGE = { day: 3, dayLimit: 300, month: 40, monthLimit: null };

const listed = [
  {
    createdAt: new Date(),
    enabled: true,
    id: "service-1",
    providers: [
      {
        createdAt: new Date(),
        dailyLimit: 300,
        enabled: true,
        fromAddress: "no-reply@services.test",
        id: "provider-0",
        lastAcceptedAt: new Date("2026-11-01T10:00:00Z"),
        monthlyLimit: null,
        name: "Provider 1",
        serviceId: "service-1",
        slot: 0,
        updatedAt: new Date(),
        version: "v-1",
      },
    ],
    type: ServiceType.MAIL,
    updatedAt: new Date(),
  },
];

const appWith = (overrides: Partial<ServicesDeps>, signedIn = true) =>
  createApp(
    appDeps({
      auth: apiAuth({
        getSession: () => Promise.resolve(signedIn ? sessionFor() : null),
      }),
      services: stubServicesDeps(overrides),
    })
  );

const admin = (overrides: Partial<ServicesDeps> = {}) =>
  appWith({ canManage: () => Promise.resolve(true), ...overrides });

const json = (method: string, body: object) => ({
  body: stringifyJson(body),
  headers: { [HTTP.HEADER.CONTENT_TYPE]: HTTP.CONTENT_TYPE.JSON },
  method,
});

const providerPath = (id: string) =>
  `${API.PATH.SERVICES}${fillPath(SERVICES.PATH.PROVIDER, { id })}`;
const testPath = (id: string) =>
  `${API.PATH.SERVICES}${fillPath(SERVICES.PATH.TEST, { id })}`;
const servicePath = (type: string) =>
  `${API.PATH.SERVICES}${fillPath(SERVICES.PATH.SERVICE, { type })}`;
const keepAlivePath = `${API.PATH.SERVICES}${SERVICES.PATH.KEEP_ALIVE}`;

describe("GET /services", () => {
  it("answers 401 signed out and 403 for anyone but a Back Office Admin", async () => {
    const out = await appWith({}, false).request(API.PATH.SERVICES);
    const refused = await appWith({}).request(API.PATH.SERVICES);
    expect(out.status).toBe(HTTP.STATUS.UNAUTHORIZED);
    expect(refused.status).toBe(HTTP.STATUS.FORBIDDEN);
  });

  it("lists the providers with the usage each reports, saying only whether one is configured", async () => {
    const res = await admin({
      configured: (slot) => slot === 0,
      listServices: () => Promise.resolve(listed),
      usageOf: () => Promise.resolve(USAGE),
    }).request(API.PATH.SERVICES);
    expect(res.status).toBe(HTTP.STATUS.OK);
    const text = await res.text();
    expect(text).not.toContain(KEY_VALUE);
    expect(text).not.toContain('"host"');
    expect(text).not.toContain('"username"');
    expect(text).toContain('"configured":true');
    expect(text).toContain(
      '"usage":{"day":3,"dayLimit":300,"month":40,"monthLimit":null}'
    );
  });

  it("answers usage null for a provider that cannot report, and still answers", async () => {
    const res = await admin({
      listServices: () => Promise.resolve(listed),
      usageOf: () => Promise.reject(new Error("vendor down")),
    }).request(API.PATH.SERVICES);
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(await res.text()).toContain('"usage":null');
  });
});

describe("GET /services?type=", () => {
  it("asks the usage of the providers of that type only", async () => {
    const asked: string[] = [];
    const res = await admin({
      listServices: () => Promise.resolve(listed),
      usageOf: (provider) => {
        asked.push(provider.id);
        return Promise.resolve(USAGE);
      },
    }).request(`${API.PATH.SERVICES}?type=${ServiceType.MAIL}`);
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(asked).toEqual(["provider-0"]);
  });

  it("answers 400 for a type no Service has", async () => {
    const res = await admin().request(`${API.PATH.SERVICES}?type=NOPE`);
    expect(res.status).toBe(HTTP.STATUS.BAD_REQUEST);
  });

  it("hands the card's daily limit with the provider, for a driver that needs it", async () => {
    const seen: number[] = [];
    await admin({
      listServices: () => Promise.resolve(listed),
      usageOf: (provider) => {
        seen.push(provider.dailyLimit);
        return Promise.resolve(USAGE);
      },
    }).request(API.PATH.SERVICES);
    expect(seen).toEqual([300]);
  });
});

describe("PATCH /services/providers/:id", () => {
  it("saves the settings on the Version and answers the new one", async () => {
    const changes: unknown[] = [];
    const res = await admin({
      updateProvider: (id, change, options) => {
        changes.push({ change, id, options });
        return Promise.resolve("v-2");
      },
    }).request(
      providerPath("provider-0"),
      json(HTTP.METHOD.PATCH, { dailyLimit: 250, version: "v-1" })
    );
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(await res.json()).toEqual({ version: "v-2" });
    expect(changes).toEqual([
      {
        change: { dailyLimit: 250 },
        id: "provider-0",
        options: { expectedVersion: "v-1" },
      },
    ]);
  });

  it("drops the provider's cached usage once saved, since its count depends on its limit", async () => {
    const forgotten: string[] = [];
    const res = await admin({
      forgetUsage: (providerId) => {
        forgotten.push(providerId);
        return Promise.resolve();
      },
      updateProvider: () => Promise.resolve("v-2"),
    }).request(
      providerPath("provider-0"),
      json(HTTP.METHOD.PATCH, { dailyLimit: 250, version: "v-1" })
    );
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(forgotten).toEqual(["provider-0"]);
  });

  it("keeps the cached usage when nothing was saved", async () => {
    const forgotten: string[] = [];
    await admin({
      forgetUsage: (providerId) => {
        forgotten.push(providerId);
        return Promise.resolve();
      },
      updateProvider: () => Promise.reject(new ResourceChangedError()),
    }).request(
      providerPath("provider-0"),
      json(HTTP.METHOD.PATCH, { dailyLimit: 250, version: "v-0" })
    );
    expect(forgotten).toEqual([]);
  });

  it("refuses a host (no longer a setting), or a negative limit", async () => {
    const app = admin();
    const statuses = await Promise.all(
      [{ host: "10.0.0.1" }, { dailyLimit: -1 }, {}].map(
        async (change) =>
          (
            await app.request(
              providerPath("provider-0"),
              json(HTTP.METHOD.PATCH, { ...change, version: "v-1" })
            )
          ).status
      )
    );
    expect(statuses.every((status) => status === HTTP.STATUS.BAD_REQUEST)).toBe(
      true
    );
  });

  it("answers 409 for a stale Version and 400 for an incomplete enabled provider", async () => {
    const stale = await admin({
      updateProvider: () => Promise.reject(new ResourceChangedError()),
    }).request(
      providerPath("provider-0"),
      json(HTTP.METHOD.PATCH, { enabled: true, version: "v-0" })
    );
    expect(stale.status).toBe(HTTP.STATUS.CONFLICT);
    const incomplete = await admin({
      updateProvider: () => Promise.reject(new ProviderIncompleteError()),
    }).request(
      providerPath("provider-0"),
      json(HTTP.METHOD.PATCH, { enabled: true, version: "v-1" })
    );
    expect(incomplete.status).toBe(HTTP.STATUS.BAD_REQUEST);
    expect((await problemOf(incomplete)).code).toBe(
      SERVICES.ERROR_CODE.PROVIDER_INCOMPLETE
    );
  });

  it("answers 404 for an unknown provider", async () => {
    const res = await admin({
      updateProvider: () => Promise.resolve(null),
    }).request(
      providerPath("missing"),
      json(HTTP.METHOD.PATCH, { enabled: false, version: "v-1" })
    );
    expect(res.status).toBe(HTTP.STATUS.NOT_FOUND);
  });
});

describe("DELETE /services/providers/:id", () => {
  it("is gone: providers are never deleted from the Services page", async () => {
    const res = await admin().request(providerPath("provider-0"), {
      method: HTTP.METHOD.DELETE,
    });
    expect(res.status).toBe(HTTP.STATUS.NOT_FOUND);
  });
});

describe("PATCH /services/:type", () => {
  it("turns a Service off by its type and answers it", async () => {
    const changes: { change: { enabled: boolean }; type: string }[] = [];
    const res = await admin({
      listServices: () => Promise.resolve(listed),
      updateService: (type, change) => {
        changes.push({ change, type });
        return Promise.resolve();
      },
    }).request(
      servicePath(ServiceType.MAIL),
      json(HTTP.METHOD.PATCH, { enabled: false })
    );
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(changes).toEqual([
      { change: { enabled: false }, type: ServiceType.MAIL },
    ]);
  });

  it("answers 400 for a type no Service has", async () => {
    const res = await admin({}).request(
      servicePath("no-such-type"),
      json(HTTP.METHOD.PATCH, { enabled: false })
    );
    expect(res.status).toBe(HTTP.STATUS.BAD_REQUEST);
  });
});

describe("POST /services/providers/:id/test", () => {
  it("sends to the signed-in Admin's own address through that provider", async () => {
    const sent: { providerId: string; to: string }[] = [];
    const res = await admin({
      emailOf: () => Promise.resolve(ADMIN_EMAIL),
      sendTest: (providerId, to) => {
        sent.push({ providerId, to });
        return Promise.resolve({ outcome: MAIL.OUTCOME.ACCEPTED, providerId });
      },
    }).request(testPath("provider-0"), { method: HTTP.METHOD.POST });
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(await res.json()).toEqual({ outcome: MAIL.OUTCOME.ACCEPTED });
    expect(sent).toEqual([{ providerId: "provider-0", to: ADMIN_EMAIL }]);
  });

  it("answers 404 for a provider that is gone, sending nothing", async () => {
    const res = await admin({
      emailOf: () => Promise.resolve(ADMIN_EMAIL),
      sendTest: () => Promise.resolve(null),
    }).request(testPath("provider-0"), { method: HTTP.METHOD.POST });
    expect(res.status).toBe(HTTP.STATUS.NOT_FOUND);
  });

  it("answers 429 once the Admin's address had its emails this hour", async () => {
    const res = await admin({
      emailOf: () => Promise.resolve(ADMIN_EMAIL),
      takeAddress: () => Promise.resolve(false),
    }).request(testPath("provider-0"), { method: HTTP.METHOD.POST });
    expect(res.status).toBe(HTTP.STATUS.TOO_MANY_REQUESTS);
    expect((await problemOf(res)).code).toBe(ERROR.CODE.RATE_LIMITED);
  });

  it("answers 403 for anyone but an Admin, sending nothing", async () => {
    const res = await appWith({
      sendTest: () => Promise.reject(new Error("must not send")),
    }).request(testPath("provider-0"), { method: HTTP.METHOD.POST });
    expect(res.status).toBe(HTTP.STATUS.FORBIDDEN);
  });
});

describe("POST /services/keep-alive", () => {
  const report = {
    services: [{ providers: [], type: ServiceType.MAIL }],
  };
  const keepAlive = () => Promise.resolve(report);

  it("runs every keep-alive for the workflow's token", async () => {
    const res = await appWith(
      { keepAlive, keepAliveToken: TOKEN },
      false
    ).request(keepAlivePath, {
      headers: { [HTTP.HEADER.AUTHORIZATION]: `Bearer ${TOKEN}` },
      method: HTTP.METHOD.POST,
    });
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(await res.json()).toEqual(report);
  });

  it.each([
    ["no token", {}],
    [
      "a wrong token",
      { [HTTP.HEADER.AUTHORIZATION]: `Bearer ${"x".repeat(40)}` },
    ],
  ])("answers 401 for %s, running nothing", async (_case, headers) => {
    const res = await appWith(
      {
        keepAlive: () => Promise.reject(new Error("must not run")),
        keepAliveToken: TOKEN,
      },
      false
    ).request(keepAlivePath, { headers, method: HTTP.METHOD.POST });
    expect(res.status).toBe(HTTP.STATUS.UNAUTHORIZED);
  });

  it("refuses everyone while no token is configured", async () => {
    const res = await appWith(
      { keepAlive: () => Promise.reject(new Error("must not run")) },
      false
    ).request(keepAlivePath, {
      headers: { [HTTP.HEADER.AUTHORIZATION]: "Bearer " },
      method: HTTP.METHOD.POST,
    });
    expect(res.status).toBe(HTTP.STATUS.UNAUTHORIZED);
  });
});
