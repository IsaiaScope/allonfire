import {
  MAIL,
  sendOutcomeSchema,
} from "@allonfire/core/features/mail/constants/mail";
import type { MailUsage } from "@allonfire/core/features/mail/types/mail";
import { versionSchema } from "@allonfire/core/features/version/constants/version";
import { objectKeys } from "@allonfire/core/shared/utils/object";
import { ServiceType } from "@allonfire/database/enums";
import type { listServices } from "@allonfire/database/features/service/provider.service";
import { z } from "zod";
import { keepAliveResultSchema } from "./services";

/** A Service as the path names it. */
export const serviceTypeParamSchema = z.object({ type: z.enum(ServiceType) });

/** `GET /services?type=`: one Service type, or every one without it. */
export const serviceListQuerySchema = z.object({
  type: z.enum(ServiceType).optional(),
});
export const providerIdParamSchema = z.object({ id: z.string().min(1) });

/** What a provider's own API says it sent, and the limits it reports for it. */
export const usageBodySchema = z.object({
  day: z.number().int(),
  /** Null: the provider reports no daily limit, so the card uses its own. */
  dayLimit: z.number().int().nullable(),
  month: z.number().int(),
  monthLimit: z.number().int().nullable(),
});

/** A provider as an Admin sees it: settings, usage, Version; never its key. */
const providerBodySchema = z.object({
  /** Whether its URL, key and driver are set in the environment; the key never leaves the API. */
  configured: z.boolean(),
  dailyLimit: z.number().int(),
  enabled: z.boolean(),
  fromAddress: z.string(),
  id: z.string(),
  lastAcceptedAt: z.iso.datetime().nullable(),
  /** Null: no monthly limit. */
  monthlyLimit: z.number().int().nullable(),
  name: z.string(),
  slot: z.number().int(),
  /** Null: the provider could not say (key scope refused, down). */
  usage: usageBodySchema.nullable(),
  version: z.string(),
});

export const serviceBodySchema = z
  .object({
    enabled: z.boolean(),
    providers: z.array(providerBodySchema),
    type: z.enum(ServiceType),
  })
  .meta({ ref: "Service" });
export type ServiceBody = z.infer<typeof serviceBodySchema>;

export const serviceListBodySchema = z
  .object({ services: z.array(serviceBodySchema) })
  .meta({ ref: "ServiceList" });
export type ServiceListBody = z.infer<typeof serviceListBodySchema>;

export const serviceUpdateRequestSchema = z.object({ enabled: z.boolean() });

const limitSchema = z.number().int().min(0).max(MAIL.LIMIT.USAGE_MAX);

/** An Admin's edit: any of the non-secret settings, at least one, on a Version. */
export const providerUpdateRequestSchema = z
  .object({
    dailyLimit: limitSchema.optional(),
    enabled: z.boolean().optional(),
    fromAddress: z.email().max(MAIL.LIMIT.ADDRESS_MAX).optional(),
    monthlyLimit: limitSchema.nullable().optional(),
    name: z.string().trim().min(1).max(MAIL.LIMIT.NAME_MAX).optional(),
    version: versionSchema,
  })
  .refine(({ version: _version, ...change }) => objectKeys(change).length > 0, {
    message: "Nothing to change",
  });

export const providerSavedBodySchema = z
  .object({ version: z.string() })
  .meta({ ref: "ProviderSaved" });
export type ProviderSavedBody = z.infer<typeof providerSavedBodySchema>;

export const testSendBodySchema = z
  .object({ outcome: sendOutcomeSchema })
  .meta({ ref: "TestSend" });
export type TestSendBody = z.infer<typeof testSendBodySchema>;

export const keepAliveBodySchema = z
  .object({
    services: z.array(
      z.object({
        providers: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            result: keepAliveResultSchema,
            slot: z.number().int(),
          })
        ),
        type: z.enum(ServiceType),
      })
    ),
  })
  .meta({ ref: "KeepAliveReport" });
export type KeepAliveBody = z.infer<typeof keepAliveBodySchema>;

type ListedService = Awaited<ReturnType<typeof listServices>>[number];

/** A Service as the API answers it: dates as ISO strings, the environment as a yes or no. */
export const toServiceBody = (
  { enabled, providers, type }: ListedService,
  configured: (slot: number) => boolean,
  usageById: ReadonlyMap<string, MailUsage | null>
): ServiceBody => ({
  enabled,
  providers: providers.map((provider) => ({
    configured: configured(provider.slot),
    dailyLimit: provider.dailyLimit,
    enabled: provider.enabled,
    fromAddress: provider.fromAddress,
    id: provider.id,
    lastAcceptedAt: provider.lastAcceptedAt?.toISOString() ?? null,
    monthlyLimit: provider.monthlyLimit,
    name: provider.name,
    slot: provider.slot,
    usage: usageById.get(provider.id) ?? null,
    version: provider.version,
  })),
  type,
});
