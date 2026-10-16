// @module-tag integration
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/shared-translations";
import { PWA } from "@allonfire/core/features/next/pwa/constants/pwa";
import { firstLoad } from "@allonfire/core/features/next/pwa/install-hint-state";
import { AOFToaster } from "@allonfire/ui/components/aof-toaster";
import { NextIntlClientProvider } from "next-intl";
import { render } from "vitest-browser-react";
import { InstallHint } from "../install-hint";

const TEXT = SHARED_TRANSLATIONS[I18N.DEFAULT_LANGUAGE].Common.Install;
const UA = {
  DESKTOP_CHROME:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  IPHONE_SAFARI:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
} as const;

const visitWith = (userAgent: string) =>
  Object.defineProperty(navigator, "userAgent", {
    configurable: true,
    value: userAgent,
  });

/** Chrome's `beforeinstallprompt`, its dialog answering `choice`. */
const offerInstall = (prompt: () => Promise<void>, outcome = "accepted") =>
  window.dispatchEvent(
    Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
      prompt,
      userChoice: Promise.resolve({ outcome, platform: "web" }),
    })
  );

const hint = () =>
  render(
    <NextIntlClientProvider
      locale={I18N.DEFAULT_LANGUAGE}
      messages={SHARED_TRANSLATIONS[I18N.DEFAULT_LANGUAGE]}
    >
      <AOFToaster />
      <InstallHint />
    </NextIntlClientProvider>
  );

// Every test is a visitor back for a second visit, never dismissed.
beforeEach(() => {
  localStorage.clear();
  firstLoad();
});

/** Sonner sends a dismissal a frame later: let the last test's land. */
const nextFrames = () =>
  new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  );

/** Long enough for a hint to arrive: a frame late, then Sonner's own timer. */
const HINT_ARRIVES_MS = 200;
const hintArrives = async () => {
  await nextFrames();
  await new Promise((resolve) => setTimeout(resolve, HINT_ARRIVES_MS));
};

afterEach(async () => {
  window.dispatchEvent(new Event("appinstalled"));
  await nextFrames();
});

describe("Install hint", () => {
  it("lists the iPhone's steps", async () => {
    visitWith(UA.IPHONE_SAFARI);
    const screen = await hint();
    const steps = screen.getByRole("listitem");
    await expect
      .element(steps.first())
      .toHaveTextContent(TEXT.step[PWA.INSTALL_HINT.STEP.IOS_SHARE]);
    await expect
      .element(steps.last())
      .toHaveTextContent(TEXT.step[PWA.INSTALL_HINT.STEP.IOS_ADD]);
    screen.unmount();
  });

  it("installs through the browser's dialog, waiting until it is installed", async () => {
    visitWith(UA.DESKTOP_CHROME);
    const screen = await hint();
    offerInstall(async () => undefined);
    await screen.getByRole("button", { name: TEXT.install }).click();
    await expect
      .element(screen.getByRole("button", { name: TEXT.installing }))
      .toBeDisabled();
    window.dispatchEvent(new Event("appinstalled"));
    await expect
      .element(screen.getByRole("complementary"))
      .not.toBeInTheDocument();
    screen.unmount();
  });

  it("says so when the dialog fails, and lets the visitor try again", async () => {
    visitWith(UA.DESKTOP_CHROME);
    const screen = await hint();
    offerInstall(() => Promise.reject(new Error("NotAllowedError")));
    await screen.getByRole("button", { name: TEXT.install }).click();
    await expect
      .element(screen.getByRole("alert"))
      .toHaveTextContent(TEXT.error);
    await expect
      .element(screen.getByRole("button", { name: TEXT.install }))
      .toBeEnabled();
    screen.unmount();
  });

  it("goes away when the dialog is refused", async () => {
    visitWith(UA.DESKTOP_CHROME);
    const screen = await hint();
    offerInstall(async () => undefined, "dismissed");
    await screen.getByRole("button", { name: TEXT.install }).click();
    await expect
      .element(screen.getByRole("complementary"))
      .not.toBeInTheDocument();
    screen.unmount();
  });

  it("goes away when dismissed, and stays away", async () => {
    visitWith(UA.IPHONE_SAFARI);
    const screen = await hint();
    await screen.getByRole("button", { name: TEXT.dismiss }).click();
    await expect
      .element(screen.getByRole("complementary"))
      .not.toBeInTheDocument();
    screen.unmount();
    const again = await hint();
    // An absence holds at once: wait until a hint would have come.
    await hintArrives();
    await expect
      .element(again.getByRole("complementary"))
      .not.toBeInTheDocument();
  });
});
