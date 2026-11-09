import { CodedError } from "@allonfire/core/features/errors/coded-error";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { checkVersion } from "@allonfire/core/features/version/utils/resource-changed-error";
import { versionOf } from "@allonfire/core/features/version/utils/version-of";
import type { MailProvider } from "../../../generated/prisma/client";
import type { ServiceType } from "../../../generated/prisma/enums";
import { prisma } from "../prisma/client";
import { SERVICE } from "./constants/service";

type Editable = Pick<
  MailProvider,
  "dailyLimit" | "enabled" | "fromAddress" | "monthlyLimit" | "name"
>;

/** What an Admin edits on a provider: its settings, any of them. */
export type ProviderChange = {
  [K in keyof Editable]?: Editable[K] | undefined;
};

/**
 * An edit would leave an enabled provider with no sender. A `CodedError`, so
 * every host's `onError` answers it as the 400 `PROVIDER_INCOMPLETE` and no
 * route maps it.
 */
export class ProviderIncompleteError extends CodedError {
  constructor(options?: ErrorOptions) {
    super(
      {
        code: SERVICE.ERROR_CODE.PROVIDER_INCOMPLETE,
        status: HTTP.STATUS.BAD_REQUEST,
      },
      options
    );
    this.name = "ProviderIncompleteError";
  }
}

/**
 * A provider's Version: its settings' last change (ADR 0028). Every setting
 * sits in the one row and Prisma's `@updatedAt` moves on each write, so
 * settings are written through `prisma.mailProvider.update` only: a raw
 * write would skip it, and the Version with it.
 */
const providerVersion = ({ updatedAt }: Pick<MailProvider, "updatedAt">) =>
  versionOf(updatedAt.toISOString());

/**
 * Stamps a provider's last acceptance, outside its Version: no Admin edit is
 * overwritten by a send, and a send never makes an open form stale.
 */
export const markAccepted = async (
  providerId: string,
  now: Date = new Date()
): Promise<void> => {
  await prisma.$executeRaw`
    UPDATE service."MailProvider" SET "lastAcceptedAt" = ${now} WHERE "id" = ${providerId}`;
};

/** Every Service and its providers in slot order, each with its Version. */
export const listServices = async () => {
  const services = await prisma.service.findMany({
    include: { providers: { orderBy: { slot: "asc" } } },
    orderBy: { type: "asc" },
  });
  return services.map(({ providers, ...service }) => ({
    ...service,
    providers: providers.map((provider) => ({
      ...provider,
      version: providerVersion(provider),
    })),
  }));
};

/** The providers a send tries, in slot order; none while the Service is off. */
export const enabledProviders = (type: ServiceType) =>
  prisma.mailProvider.findMany({
    orderBy: { slot: "asc" },
    where: { enabled: true, service: { enabled: true, type } },
  });

/** One provider by id, whatever its switches say; null when it is gone. */
export const findProvider = (id: string) =>
  prisma.mailProvider.findUnique({ where: { id } });

/**
 * One provider to send a test through: found while its Service is on,
 * whatever its own switch says, so a new provider can be tried first.
 */
export const sendableProvider = (type: ServiceType, id: string) =>
  prisma.mailProvider.findFirst({
    where: { id, service: { enabled: true, type } },
  });

/** A change as Prisma writes it: only the settings it names. */
const writtenOf = (change: ProviderChange) => ({
  ...(change.dailyLimit !== undefined && { dailyLimit: change.dailyLimit }),
  ...(change.enabled !== undefined && { enabled: change.enabled }),
  ...(change.fromAddress !== undefined && { fromAddress: change.fromAddress }),
  ...(change.monthlyLimit !== undefined && {
    monthlyLimit: change.monthlyLimit,
  }),
  ...(change.name !== undefined && { name: change.name }),
});

/** Turns a Service on or off. */
export const updateService = async (
  type: ServiceType,
  change: { enabled: boolean }
): Promise<void> => {
  await prisma.service.update({ data: change, where: { type } });
};

/**
 * Saves an Admin's change to a provider on the Version it was opened on,
 * answering the new Version, or null for an unknown provider; core's
 * `ResourceChangedError` and nothing written when it changed since, and
 * `ProviderIncompleteError` when it would be enabled with no sender.
 */
export const updateProvider = (
  id: string,
  change: ProviderChange,
  { expectedVersion }: { expectedVersion: string }
): Promise<string | null> =>
  prisma.$transaction(async (tx) => {
    const [row] = await tx.$queryRaw<
      Pick<MailProvider, "enabled" | "fromAddress" | "updatedAt">[]
    >`
      SELECT "updatedAt", "enabled", "fromAddress"
      FROM service."MailProvider" WHERE "id" = ${id} FOR UPDATE`;
    if (!row) {
      return null;
    }
    checkVersion(expectedVersion, providerVersion(row));
    const merged = { ...row, ...writtenOf(change) };
    if (merged.enabled && !merged.fromAddress) {
      throw new ProviderIncompleteError();
    }
    const saved = await tx.mailProvider.update({
      data: writtenOf(change),
      select: { updatedAt: true },
      where: { id },
    });
    return providerVersion(saved);
  });
