import { createHash, timingSafeEqual } from "node:crypto";
import { guard } from "@allonfire/auth/features/hono/guards/utils/guard";
import type { AuthEnv } from "@allonfire/auth/features/hono/types/variables";
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import {
  CodedError,
  invalidHook,
  notFound,
} from "@allonfire/core/features/errors/coded-error";
import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import type { MailUsage } from "@allonfire/core/features/mail/types/mail";
import { UNIT } from "@allonfire/core/shared/constants/units";
import type { MiddlewareHandler } from "hono";
import { createFactory } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { validator } from "hono-openapi";
import { localeOf } from "../../i18n/middleware/locale-resolver";
import { EMAIL } from "../../mail/constants/email";
import {
  type KeepAliveBody,
  type ProviderSavedBody,
  providerIdParamSchema,
  providerUpdateRequestSchema,
  type ServiceListBody,
  serviceListQuerySchema,
  serviceTypeParamSchema,
  serviceUpdateRequestSchema,
  type TestSendBody,
  toServiceBody,
} from "../constants/schemas";
import type { ServicesDeps } from "../utils/deps";
import {
  keepAliveRoute,
  listRoute,
  providerRoute,
  serviceRoute,
  testRoute,
} from "./routes";

const factory = createFactory<AuthEnv>();

/** A Back Office Admin, read now, on a Session still there. */
const canManage = (deps: ServicesDeps) =>
  guard((session) =>
    deps.canManage({ sessionId: session.session.id, userId: session.user.id })
  );

const digest = (value: string) => createHash("sha256").update(value).digest();
const BEARER = "Bearer ";

/**
 * The workflow service's token, compared in constant time; any other caller,
 * or every caller while no token is configured, gets a 401 and nothing runs.
 */
const keepAliveToken =
  (deps: ServicesDeps): MiddlewareHandler =>
  async (c, next) => {
    const sent = c.req.header(HTTP.HEADER.AUTHORIZATION) ?? "";
    const token = sent.startsWith(BEARER) ? sent.slice(BEARER.length) : "";
    const expected = deps.keepAliveToken;
    if (
      !(expected && token && timingSafeEqual(digest(token), digest(expected)))
    ) {
      throw new HTTPException(HTTP.STATUS.UNAUTHORIZED);
    }
    await next();
  };

type ListedServices = Awaited<ReturnType<ServicesDeps["listServices"]>>;

/**
 * What each provider reports, asked side by side so one slow vendor never
 * queues the rest; one that fails reads as null, never fails the page.
 */
const usageOfProviders = async (
  deps: ServicesDeps,
  services: ListedServices
): Promise<ReadonlyMap<string, MailUsage | null>> => {
  const providers = services.flatMap((service) => service.providers);
  const usages = await Promise.all(
    providers.map((provider) => deps.usageOf(provider).catch(() => null))
  );
  return new Map(
    providers.map((provider, index) => [provider.id, usages[index] ?? null])
  );
};

const bodyOf = async (deps: ServicesDeps, services: ListedServices) => {
  const usage = await usageOfProviders(deps, services);
  return services.map((service) =>
    toServiceBody(service, deps.configured, usage)
  );
};

/**
 * Every Service, or with `?type=` that one: a page of one type asks no other
 * type's provider for its usage.
 */
export const listHandlers = (deps: ServicesDeps) =>
  factory.createHandlers(
    listRoute,
    canManage(deps),
    validator("query", serviceListQuerySchema, invalidHook),
    async (c) => {
      const { type } = c.req.valid("query");
      const services = (await deps.listServices()).filter(
        (service) => type === undefined || service.type === type
      );
      return c.json(
        { services: await bodyOf(deps, services) } satisfies ServiceListBody,
        HTTP.STATUS.OK
      );
    }
  );

export const serviceHandlers = (deps: ServicesDeps) =>
  factory.createHandlers(
    serviceRoute,
    canManage(deps),
    validator("param", serviceTypeParamSchema, invalidHook),
    validator("json", serviceUpdateRequestSchema, invalidHook),
    async (c) => {
      const { type } = c.req.valid("param");
      await deps.updateService(type, c.req.valid("json"));
      const saved = (await deps.listServices()).find(
        (one) => one.type === type
      );
      if (!saved) {
        throw notFound();
      }
      const [body] = await bodyOf(deps, [saved]);
      if (!body) {
        throw notFound();
      }
      return c.json(body, HTTP.STATUS.OK);
    }
  );

export const providerHandlers = (deps: ServicesDeps) =>
  factory.createHandlers(
    providerRoute,
    canManage(deps),
    validator("param", providerIdParamSchema, invalidHook),
    validator("json", providerUpdateRequestSchema, invalidHook),
    async (c) => {
      const { id } = c.req.valid("param");
      const { version, ...change } = c.req.valid("json");
      // Changed since the edit's Version, or left incomplete: the service
      // throws the coded 409 or 400.
      const saved = await deps.updateProvider(id, change, {
        expectedVersion: version,
      });
      if (!saved) {
        throw notFound();
      }
      // The day's count depends on the limit, and the cache holds the old one.
      await deps.forgetUsage(id);
      return c.json(
        { version: saved } satisfies ProviderSavedBody,
        HTTP.STATUS.OK
      );
    }
  );

export const testHandlers = (deps: ServicesDeps) =>
  factory.createHandlers(
    testRoute,
    canManage(deps),
    validator("param", providerIdParamSchema, invalidHook),
    async (c) => {
      const { id } = c.req.valid("param");
      const session = c.get(AUTH.VAR.SESSION);
      const to = session && (await deps.emailOf(session.user.id));
      if (!to) {
        throw notFound();
      }
      if (!(await deps.takeAddress(to))) {
        throw new CodedError({
          code: ERROR.CODE.RATE_LIMITED,
          status: HTTP.STATUS.TOO_MANY_REQUESTS,
          values: {
            seconds: EMAIL.ADDRESS_LIMIT.WINDOW_MS / UNIT.MS_PER_SECOND,
          },
        });
      }
      const sent = await deps.sendTest(id, to, localeOf(c));
      if (!sent) {
        throw notFound();
      }
      return c.json(
        { outcome: sent.outcome } satisfies TestSendBody,
        HTTP.STATUS.OK
      );
    }
  );

export const keepAliveHandlers = (deps: ServicesDeps) =>
  factory.createHandlers(keepAliveRoute, keepAliveToken(deps), async (c) =>
    c.json((await deps.keepAlive()) satisfies KeepAliveBody, HTTP.STATUS.OK)
  );
