// @module-tag unit
import { UNIT } from "@allonfire/core/shared/constants/units";
import { staleTestDatabases, templateName, testDatabaseName } from "../names";

const NOW = new Date("2026-10-13T12:00:00Z");
const EPOCH = NOW.getTime() / UNIT.MS_PER_SECOND;
const TWO_DAYS_AGO = EPOCH - 2 * UNIT.SECONDS_PER_DAY;

const crashed = testDatabaseName("api", `${TWO_DAYS_AGO}_crash1`);
const running = testDatabaseName("api", `${EPOCH}_alive1`);
const oldTemplate = templateName("aaaaaa", TWO_DAYS_AGO);
const current = templateName("bbbbbb", TWO_DAYS_AGO);

it("lists crashed runs' clones and old templates, never the template in use", () => {
  expect(
    staleTestDatabases(
      ["allonfire", "postgres", crashed, running, oldTemplate, current],
      current,
      NOW
    )
  ).toEqual([crashed, oldTemplate]);
});
