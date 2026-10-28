// @module-tag unit
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/shared-translations";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { toast } from "sonner";
import { AOF_TOAST } from "../../lib/use-aof-toast";
import { AOFQueryProvider } from "../aof-query-provider";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

let client: QueryClient | undefined;
const Reads = () => {
  client = useQueryClient();
  return <p>Users</p>;
};

describe("AOFQueryProvider", () => {
  it("draws its children; a failed mutation becomes the shared error toast", async () => {
    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale="en" messages={SHARED_TRANSLATIONS.en}>
        <AOFQueryProvider>
          <Reads />
        </AOFQueryProvider>
      </NextIntlClientProvider>
    );
    expect(html).toBe("<p>Users</p>");
    if (!client) {
      throw new Error("the provider gave no client");
    }
    await client
      .getMutationCache()
      .build(client, { mutationFn: () => Promise.reject(new Error("down")) })
      .execute(undefined)
      .catch(() => undefined);
    const { failed } = SHARED_TRANSLATIONS.en.Common.Request;
    expect(toast.error).toHaveBeenCalledWith(expect.anything(), {
      id: `error:${failed}`,
      ...AOF_TOAST.NEEDS_READING,
    });
  });
});
