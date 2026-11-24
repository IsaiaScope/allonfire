// @module-tag integration
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { aofTranslators } from "@allonfire/core/features/next/i18n/utils/aof-translators";
import { firstLoad } from "@allonfire/core/features/next/pwa/utils/install-hint-state";
import { renderInUi } from "../../../shared/tests/render-in-ui";
import {
  nextFrames,
  toastWouldHaveArrived,
} from "../../../shared/tests/toast-timing";
import { AOFInstallHint } from "../components/aof-install-hint";
import type { AOFInstallHintCardProps } from "../types/install-hint-card";

const TEXT = SHARED_TRANSLATIONS.en.Common.Install;
const APP = "Her App";
const translate = aofTranslators({ en: {}, it: {} }).en;
const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";

/** The App's own card, as far as the hint is concerned: its words and ✕. */
const Card = ({ cta, dismissProps, steps }: AOFInstallHintCardProps) => (
  <aside>
    <p>{cta}</p>
    <ul>
      {steps?.map(({ step, text }) => (
        <li key={step}>{text}</li>
      ))}
    </ul>
    <button
      aria-label={dismissProps["aria-label"]}
      onClick={dismissProps.onClick}
      type="button"
    >
      ✕
    </button>
  </aside>
);

const hint = () =>
  renderInUi({
    children: <AOFInstallHint appName={APP} Card={Card} />,
    messages: {},
  });

// Every test is a visitor back for a second visit on an iPhone, never dismissed.
beforeEach(() => {
  localStorage.clear();
  firstLoad();
  Object.defineProperty(navigator, "userAgent", {
    configurable: true,
    value: IPHONE_SAFARI,
  });
});

/** Sonner sends a dismissal a frame later: let the last test's land. */
afterEach(async () => {
  window.dispatchEvent(new Event("appinstalled"));
  await nextFrames();
});

describe("AOFInstallHint", () => {
  it("sends the App's card with its name in the words and the browser's steps", async () => {
    const screen = await hint();
    await expect
      .element(screen.getByText(translate("Common.Install.cta", { app: APP })))
      .toBeVisible();
    await expect.element(screen.getByRole("listitem").first()).toBeVisible();
    screen.unmount();
  });

  it("goes away when dismissed, and stays away", async () => {
    const screen = await hint();
    await screen.getByRole("button", { name: TEXT.dismiss }).click();
    await expect
      .element(screen.getByRole("complementary"))
      .not.toBeInTheDocument();
    screen.unmount();
    const again = await hint();
    // An absence holds at once: wait until a hint would have come.
    await toastWouldHaveArrived();
    await expect
      .element(again.getByRole("complementary"))
      .not.toBeInTheDocument();
  });
});
