// @module-tag integration
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { bindRenderInUi, renderInUi } from "./render-in-ui";

const Failed = () => <p>{useTranslations("Common.Request")("failed")}</p>;

/** Fails its first answer, then says "loaded", as a query that retries once. */
const Flaky = () => {
  const attempts = { count: 0 };
  const { data } = useQuery({
    queryFn: () => {
      attempts.count += 1;
      return attempts.count === 1
        ? Promise.reject(new Error("first answer fails"))
        : Promise.resolve("loaded");
    },
    queryKey: ["flaky"],
    retry: 1,
  });
  return <p>{data ?? "waiting"}</p>;
};

/** Well under TanStack's own 1s wait before a first retry. */
const BEFORE_DEFAULT_RETRY_MS = 400;

describe("renderInUi", () => {
  it("retries a query at once, so a test never waits on TanStack's clock", async () => {
    const screen = await renderInUi({ children: <Flaky />, messages: {} });
    await expect
      .element(screen.getByText("loaded"), { timeout: BEFORE_DEFAULT_RETRY_MS })
      .toBeVisible();
  });

  it("shows core's shared text in the language asked for", async () => {
    const english = await renderInUi({ children: <Failed />, messages: {} });
    await expect
      .element(english.getByText(SHARED_TRANSLATIONS.en.Common.Request.failed))
      .toBeVisible();
    await english.unmount();

    const italian = await renderInUi({
      children: <Failed />,
      language: "it",
      messages: {},
    });
    await expect
      .element(italian.getByText(SHARED_TRANSLATIONS.it.Common.Request.failed))
      .toBeVisible();
  });

  it("binds an App's own words once, which a call can swap", async () => {
    const OWN = { Own: { hello: "Hello from the App" } };
    const Hello = () => <p>{useTranslations("Own")("hello")}</p>;
    const renderInApp = bindRenderInUi(OWN);

    const bound = await renderInApp({ children: <Hello /> });
    await expect.element(bound.getByText(OWN.Own.hello)).toBeVisible();
    await bound.unmount();

    const swapped = await renderInApp({
      children: <Hello />,
      messages: { Own: { hello: "Swapped" } },
    });
    await expect.element(swapped.getByText("Swapped")).toBeVisible();
  });
});
