// @module-tag unit
import { EventEmitter } from "node:events";
import { captureLog } from "../../logger/tests/capture";
import { REDIS } from "../constants/redis";
import { watchRedis } from "../redis";

describe("watchRedis", () => {
  it("logs one line per outage, not one per reconnect attempt", () => {
    const { lines, logger } = captureLog();
    const redis = new EventEmitter();
    watchRedis(redis, logger);

    redis.emit(REDIS.EVENT.ERROR, new Error("ECONNREFUSED"));
    redis.emit(REDIS.EVENT.ERROR, new Error("ECONNREFUSED"));
    redis.emit(REDIS.EVENT.READY);
    redis.emit(REDIS.EVENT.ERROR, new Error("ECONNREFUSED"));

    expect(lines.map((line) => line.msg)).toEqual([
      "redis unreachable",
      "redis reconnected",
      "redis unreachable",
    ]);
  });
});
