// @module-tag unit

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO } from "@allonfire/config/local/repo";
import { objectHas } from "@allonfire/core/shared/utils/object";
import { openApiPath } from "@allonfire/core/shared/utils/route-path";
import { z } from "zod";
import { createApp } from "../../../app";
import { API } from "../../../shared/constants/api";
import { appDeps } from "../../../shared/tests/app-deps";

const GUIDE = resolve(REPO.ROOT, "docs", "guides", "laura.md");
/** An operation the guide names: `GET /v1/…`. */
const OPERATION = /`(GET|PUT|POST|PATCH|DELETE) (\/v1\/[^`\s]+)`/g;

const specSchema = z.object({
  paths: z.record(z.string(), z.looseObject({})),
});

describe("the Laura guide's API routes", () => {
  it("names only operations the API's document holds", async () => {
    const response = await createApp(appDeps()).request(API.PATH.OPENAPI);
    const { paths } = specSchema.parse(await response.json());
    const named = [...readFileSync(GUIDE, "utf8").matchAll(OPERATION)].map(
      ([, method = "", path = ""]) => ({ method, path: openApiPath(path) })
    );

    expect(named.length).toBeGreaterThan(0);
    expect(
      named.filter(({ method, path }) => {
        const operations = paths[path];
        return !(operations && objectHas(operations, method.toLowerCase()));
      })
    ).toEqual([]);
  });
});
