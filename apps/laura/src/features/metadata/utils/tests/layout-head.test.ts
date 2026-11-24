// @module-tag unit
// @vitest-environment node
import { LOCAL } from "@allonfire/config/local/addresses";
import { layoutHead } from "../layout-head";

vi.mock("next-intl/server", () => ({ getLocale: async () => "it" }));
vi.mock("@/environment/environment", () => ({
  env: { LAURA_URL: LOCAL.URL.LAURA },
}));

describe("layoutHead", () => {
  it("builds the head in the request's language on the App's own address", async () => {
    const head = await layoutHead();
    expect(head.metadataBase).toEqual(new URL(LOCAL.URL.LAURA));
    expect(head.description).toBe(
      (await import("@/features/i18n/translations/it.json")).default.Metadata
        .description
    );
  });
});
