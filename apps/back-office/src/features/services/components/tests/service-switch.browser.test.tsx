// @module-tag integration

import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { aofMessages } from "@allonfire/core/features/next/i18n/utils/aof-translators";
import { aofErrorCaches } from "@allonfire/core/features/next/query/utils/aof-query-errors";
import { ServiceType } from "@allonfire/database/enums";
import { QUIET_MS } from "@allonfire/ui/features/query/hooks/use-aof-quiet-toggle";
import { aofToast } from "@allonfire/ui/shared/hooks/use-aof-toast";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { QUERY } from "@/shared/constants/query";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import { setServiceEnabled } from "../../actions/services";
import {
  type ServiceList,
  servicesListKey,
} from "../../utils/services-queries";
import { ServiceSwitch } from "../service-switch";

vi.mock("../../actions/services", () => ({ setServiceEnabled: vi.fn() }));
vi.mock("@allonfire/ui/shared/hooks/use-aof-toast", async (original) => ({
  ...(await original<
    typeof import("@allonfire/ui/shared/hooks/use-aof-toast")
  >()),
  aofToast: vi.fn(),
}));

const t = EN.Services.serviceEnabled;
const KEY = servicesListKey(ServiceType.MAIL);

/** The Mail list with its Service on or off, no providers: only the switch is under test. */
const listOf = (enabled: boolean): ServiceList => ({
  services: [{ enabled, providers: [], type: ServiceType.MAIL }],
});

/** What the API holds, so a read after a save answers it. */
const server = { enabled: true };

/** The parent's job in `service-providers.tsx`: the switch shows what the cache holds. */
const Cached = () => {
  const { data } = useQuery({
    queryFn: () => Promise.resolve(listOf(server.enabled)),
    queryKey: KEY,
    staleTime: "static",
  });
  return (
    <ServiceSwitch
      enabled={data?.services[0]?.enabled ?? true}
      type={ServiceType.MAIL}
    />
  );
};

let queryClient = new QueryClient();
const renderSwitch = () =>
  render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider
        locale={I18N.DEFAULT_LANGUAGE}
        messages={aofMessages("en", EN)}
      >
        <Cached />
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
/** A Gooey choice's option: a button, the chosen one `aria-current`. */
const choice = (name: string) =>
  page.getByRole("radiogroup", { name: t.label }).getByRole("button", { name });

/** An action that waits until `release` is called, then answers `answer`. */
const held = (answer: boolean) => {
  let release: () => void = () => undefined;
  const promise = new Promise<boolean>((resolve) => {
    release = () => resolve(answer);
  });
  return { promise, release };
};

/** Lets the quiet that follows a burst of choices run out, on the fake clock. */
const quiet = () => vi.advanceTimersByTimeAsync(QUIET_MS * 2);

/** The clock the quiet runs on: only its timers are fake, the clicks stay real. */
const fakeQuiet = () =>
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

/** The API saves each choice and holds it. */
const saveAtOnce = () =>
  vi.mocked(setServiceEnabled).mockImplementation((_type, enabled) => {
    server.enabled = enabled;
    return Promise.resolve(true);
  });

afterEach(() => vi.useRealTimers());

beforeEach(() => {
  server.enabled = true;
  queryClient = new QueryClient({
    ...aofErrorCaches({
      fallback: "failed",
      notify: (message) => aofToast(message, "error"),
    }),
  });
  queryClient.setQueryData(KEY, listOf(true));
  vi.mocked(setServiceEnabled).mockReset();
  vi.mocked(aofToast).mockReset();
});

it("turns the Service off as soon as Off is chosen, before the API answers", async () => {
  const save = held(true);
  vi.mocked(setServiceEnabled).mockReturnValue(save.promise);
  await renderSwitch();
  await choice(t.off).click();
  await expect
    .poll(() => setServiceEnabled)
    .toHaveBeenCalledWith(ServiceType.MAIL, false);
  await expect.element(choice(t.off)).toHaveAttribute("aria-current", "page");
  expect(queryClient.getQueryData(KEY)).toEqual(listOf(false));
  expect(aofToast).not.toHaveBeenCalled();
  save.release();
});

it("keeps the choice once the Service is saved and read again", async () => {
  saveAtOnce();
  await renderSwitch();
  await choice(t.off).click();
  await expect.poll(() => queryClient.getQueryData(KEY)).toEqual(listOf(false));
  await expect.element(choice(t.off)).toHaveAttribute("aria-current", "page");
  expect(aofToast).not.toHaveBeenCalled();
});

it("refreshes the Services on screen once the Service is saved", async () => {
  vi.mocked(setServiceEnabled).mockResolvedValue(true);
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");
  await renderSwitch();
  await choice(t.off).click();
  await expect
    .poll(() => invalidate)
    .toHaveBeenCalledWith({ queryKey: QUERY.SERVICES.ALL });
});

it("sends nothing when the option already shown is chosen again", async () => {
  vi.mocked(setServiceEnabled).mockResolvedValue(true);
  await renderSwitch();
  await choice(t.on).click();
  await choice(t.on).click();
  expect(setServiceEnabled).not.toHaveBeenCalled();
});

it.each([
  ["refused", () => Promise.resolve(false)],
  ["unreachable", () => Promise.reject(new Error("fetch failed"))],
])(
  "puts the confirmed choice back and says so when the save is %s",
  async (_, answer) => {
    vi.mocked(setServiceEnabled).mockImplementation(answer);
    await renderSwitch();
    await choice(t.off).click();
    await expect.element(choice(t.on)).toHaveAttribute("aria-current", "page");
    expect(queryClient.getQueryData(KEY)).toEqual(listOf(true));
    expect(aofToast).toHaveBeenCalledWith(t.failed, "error");
  }
);

it("saves a burst of choices once, the last", async () => {
  fakeQuiet();
  saveAtOnce();
  await renderSwitch();
  await choice(t.off).click();
  await choice(t.on).click();
  await choice(t.off).click();
  await expect.element(choice(t.off)).toHaveAttribute("aria-current", "page");
  expect(setServiceEnabled).not.toHaveBeenCalled();
  await quiet();
  expect(vi.mocked(setServiceEnabled).mock.calls).toEqual([
    [ServiceType.MAIL, false],
  ]);
});

it("saves nothing when a burst ends where it began", async () => {
  fakeQuiet();
  saveAtOnce();
  await renderSwitch();
  await choice(t.off).click();
  await choice(t.on).click();
  await expect.element(choice(t.on)).toHaveAttribute("aria-current", "page");
  await quiet();
  expect(setServiceEnabled).not.toHaveBeenCalled();
});

it("runs a choice made while one is being saved after it, in order", async () => {
  fakeQuiet();
  const first = held(true);
  const calls: boolean[] = [];
  vi.mocked(setServiceEnabled).mockImplementation((_type, enabled) => {
    calls.push(enabled);
    if (calls.length === 1) {
      return first.promise;
    }
    server.enabled = enabled;
    return Promise.resolve(true);
  });
  await renderSwitch();
  await choice(t.off).click();
  await quiet();
  expect(calls).toEqual([false]);
  await choice(t.on).click();
  await quiet();
  expect(calls).toEqual([false]);
  first.release();
  await vi.advanceTimersByTimeAsync(100);
  expect(calls).toEqual([false, true]);
  await expect.element(choice(t.on)).toHaveAttribute("aria-current", "page");
});
