// @module-tag integration
import { ResourceChangedError } from "@allonfire/core/features/version/utils/resource-changed-error";
import { ServiceType } from "../../../../generated/prisma/enums";
import { prisma } from "../../prisma/client";
import {
  enabledProviders,
  findProvider,
  listServices,
  markAccepted,
  ProviderIncompleteError,
  sendableProvider,
  updateProvider,
  updateService,
} from "../provider.service";

/** Past the seeded slots, so a test's provider never meets the real ones. */
const FIRST_TEST_SLOT = 100;
let nextSlot = FIRST_TEST_SLOT;

const mail = () =>
  prisma.service.findUniqueOrThrow({ where: { type: ServiceType.MAIL } });

/** A provider of its own for each test, enabled, with a sender. */
const provider = async (
  overrides: Partial<{ enabled: boolean; fromAddress: string }> = {}
) => {
  const { id: serviceId } = await mail();
  nextSlot += 1;
  return prisma.mailProvider.create({
    data: {
      dailyLimit: 10,
      fromAddress: "no-reply@provider.test",
      name: `Provider ${nextSlot}`,
      serviceId,
      slot: nextSlot,
      ...overrides,
    },
  });
};

afterEach(async () => {
  await prisma.mailProvider.deleteMany({
    where: { slot: { gte: FIRST_TEST_SLOT } },
  });
  await prisma.service.update({
    data: { enabled: true },
    where: { type: ServiceType.MAIL },
  });
});

describe("listServices", () => {
  it("lists the providers in slot order, each with a Version and no usage", async () => {
    const later = await provider();
    const sooner = await provider();
    const [service] = await listServices();
    const slots = (service?.providers ?? []).map(({ slot }) => slot);
    expect(slots).toEqual([...slots].sort((a, b) => a - b));
    const listed = service?.providers.find(({ id }) => id === sooner.id);
    expect(listed?.version).toEqual(expect.any(String));
    expect(listed).not.toHaveProperty("usage");
    expect(service?.providers.map(({ id }) => id)).toContain(later.id);
  });
});

describe("enabledProviders", () => {
  it("lists the enabled providers in slot order and none while the Service is off", async () => {
    const on = await provider();
    await provider({ enabled: false });
    const ids = (await enabledProviders(ServiceType.MAIL)).map(({ id }) => id);
    expect(ids).toContain(on.id);
    expect(ids).toHaveLength(
      await prisma.mailProvider.count({ where: { enabled: true } })
    );
    await updateService(ServiceType.MAIL, { enabled: false });
    expect(await enabledProviders(ServiceType.MAIL)).toEqual([]);
  });
});

describe("sendableProvider", () => {
  it("finds a disabled provider to send through while its Service is on", async () => {
    const { id } = await provider({ enabled: false });
    expect((await sendableProvider(ServiceType.MAIL, id))?.id).toBe(id);
    await updateService(ServiceType.MAIL, { enabled: false });
    expect(await sendableProvider(ServiceType.MAIL, id)).toBeNull();
  });
});

describe("findProvider", () => {
  it("finds a provider by id, null for an unknown one", async () => {
    const { id } = await provider();
    expect((await findProvider(id))?.id).toBe(id);
    expect(await findProvider("missing")).toBeNull();
  });
});

describe("markAccepted", () => {
  it("stamps the last acceptance without moving the provider's Version", async () => {
    const { id } = await provider();
    const before = await listVersion(id);
    const now = new Date("2026-11-09T10:00:00.000Z");
    await markAccepted(id, now);
    expect((await findProvider(id))?.lastAcceptedAt).toEqual(now);
    expect(await listVersion(id)).toBe(before);
  });
});

const listVersion = async (id: string) =>
  (await listServices())
    .flatMap(({ providers }) => providers)
    .find((one) => one.id === id)?.version;

describe("updateProvider", () => {
  it("saves on the Version it was opened on, answering the new one", async () => {
    const { id } = await provider();
    const opened = await listVersion(id);
    const saved = await updateProvider(
      id,
      { dailyLimit: 20, name: "Renamed" },
      { expectedVersion: opened ?? "" }
    );
    expect(saved).not.toBe(opened);
    expect(await findProvider(id)).toMatchObject({
      dailyLimit: 20,
      name: "Renamed",
    });
  });

  it("refuses a save made on a Version that has changed", async () => {
    const { id } = await provider();
    const opened = await listVersion(id);
    await updateProvider(
      id,
      { name: "First" },
      { expectedVersion: opened ?? "" }
    );
    await expect(
      updateProvider(id, { name: "Second" }, { expectedVersion: opened ?? "" })
    ).rejects.toBeInstanceOf(ResourceChangedError);
    expect((await findProvider(id))?.name).toBe("First");
  });

  it("refuses to enable a provider that has no sender", async () => {
    const { id } = await provider({ enabled: false, fromAddress: "" });
    await expect(
      updateProvider(
        id,
        { enabled: true },
        { expectedVersion: (await listVersion(id)) ?? "" }
      )
    ).rejects.toBeInstanceOf(ProviderIncompleteError);
  });

  it("answers null for an unknown provider", async () => {
    expect(
      await updateProvider("missing", { name: "x" }, { expectedVersion: "v" })
    ).toBeNull();
  });
});
