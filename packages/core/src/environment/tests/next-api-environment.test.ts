// @module-tag unit
import { z } from "zod";
import { nextApiEnvSchema } from "../next-api-environment";

const clientSchema = z.object(nextApiEnvSchema.client);
const serverSchema = z.object(nextApiEnvSchema.server);
const URL_VALUE = "https://api.example.test";

describe("nextApiEnvSchema", () => {
  it("asks the browser for the API's public address", () => {
    expect(
      clientSchema.safeParse({ NEXT_PUBLIC_API_URL: URL_VALUE }).success
    ).toBe(true);
    const refused = clientSchema.safeParse({
      NEXT_PUBLIC_API_URL: "not a url",
    });
    expect(refused.error?.issues[0]?.path).toEqual(["NEXT_PUBLIC_API_URL"]);
    expect(clientSchema.safeParse({}).success).toBe(false);
  });

  it("takes the remote address, which only Local sets, as optional but never a non-URL", () => {
    const base = { NEXT_PUBLIC_API_URL: URL_VALUE };
    expect(clientSchema.safeParse(base).success).toBe(true);
    expect(
      clientSchema.safeParse({ ...base, NEXT_PUBLIC_API_REMOTE_URL: URL_VALUE })
        .success
    ).toBe(true);
    const refused = clientSchema.safeParse({
      ...base,
      NEXT_PUBLIC_API_REMOTE_URL: "not a url",
    });
    expect(refused.error?.issues[0]?.path).toEqual([
      "NEXT_PUBLIC_API_REMOTE_URL",
    ]);
  });

  it("asks the server for the API's internal address", () => {
    expect(serverSchema.safeParse({ API_URL: URL_VALUE }).success).toBe(true);
    expect(serverSchema.safeParse({}).success).toBe(false);
    expect(serverSchema.safeParse({ API_URL: "not a url" }).success).toBe(
      false
    );
  });
});
