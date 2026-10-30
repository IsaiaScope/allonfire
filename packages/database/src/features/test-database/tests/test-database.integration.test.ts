// @module-tag integration
import { UNIT } from "@allonfire/core/shared/constants/units";
import { env } from "../../../environment/environment";
import { FIXTURE } from "../../seed/fixtures/fixtures";
import { templateName, testDatabaseName } from "../names";
import {
  createDatabase,
  DOCKER_TIMEOUT,
  databasesOnServer,
  dropDatabase,
  withClient,
} from "../server";
import { ensureTemplate, templateFingerprint } from "../template";
import {
  createTestDatabase,
  dropTestDatabase,
  dropTestDatabasesOf,
  sweepTestDatabases,
} from "../test-database";

const SERVER = env.DATABASE_URL;
const EPOCH = Math.floor(Date.now() / UNIT.MS_PER_SECOND);

describe("Test databases", { timeout: DOCKER_TIMEOUT }, () => {
  it("names the template by its fingerprint and builds it once when two runs ask at once", async () => {
    const [first, second] = await Promise.all([
      ensureTemplate(SERVER),
      ensureTemplate(SERVER),
    ]);
    expect(first).toBe(second);
    expect(first.endsWith(`_${templateFingerprint().slice(0, 6)}`)).toBe(true);
    expect(await ensureTemplate(SERVER)).toBe(first);
  });

  it("leaves alone a template another tree built from other sources", async () => {
    const other = templateName("zzzzzz", EPOCH);
    await createDatabase(SERVER, other);
    try {
      await ensureTemplate(SERVER);
      expect(await databasesOnServer(SERVER)).toContain(other);
    } finally {
      await dropDatabase(SERVER, other);
    }
  });

  it("clones the template with every Fixture User, then drops the clone", async () => {
    const stamp = `${EPOCH}_clonet`;
    const admin = await withClient(
      await createTestDatabase(SERVER, "selftest", stamp),
      (client) =>
        client.user.findUnique({
          where: { email: FIXTURE.USER.BACK_OFFICE.ADMIN.email },
        })
    );
    expect(admin).not.toBeNull();
    await dropTestDatabase(SERVER, "selftest", stamp);
    expect(await databasesOnServer(SERVER)).not.toContain(
      testDatabaseName("selftest", stamp)
    );
  });

  it("sweeps a crashed run's clone and keeps the template in use", async () => {
    const twoDaysAgo = EPOCH - 2 * UNIT.SECONDS_PER_DAY;
    const oldClone = `${twoDaysAgo}_oldone`;
    await createTestDatabase(SERVER, "selftest", oldClone);
    // The tree's own template: any other `keep` would let this sweep drop it
    // under the packages testing beside this one.
    const template = await ensureTemplate(SERVER);
    await sweepTestDatabases(SERVER, template);
    // Gone, whoever dropped it: another package's run sweeps the same names.
    const left = await databasesOnServer(SERVER);
    expect(left).not.toContain(testDatabaseName("selftest", oldClone));
    expect(left).toContain(template);
  });

  it("drops every earlier run of a label, however young, and no other label's", async () => {
    const mine = testDatabaseName("solotest", `${EPOCH}_young1`);
    const other = testDatabaseName("solotest_two", `${EPOCH}_young2`);
    await Promise.all([
      createDatabase(SERVER, mine),
      createDatabase(SERVER, other),
    ]);
    try {
      const dropped = await dropTestDatabasesOf(SERVER, "solotest");
      expect(dropped).toContain(mine);
      expect(dropped).not.toContain(other);
      const left = await databasesOnServer(SERVER);
      expect(left).not.toContain(mine);
      expect(left).toContain(other);
    } finally {
      await dropDatabase(SERVER, other);
    }
  });
});
