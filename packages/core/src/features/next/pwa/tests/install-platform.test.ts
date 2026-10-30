// @module-tag unit
import { PWA } from "../constants/pwa";
import { installPlatform } from "../install-platform";

const UA = {
  ANDROID_CHROME:
    "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
  ANDROID_SAMSUNG:
    "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36",
  DESKTOP_CHROME:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  DESKTOP_EDGE:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0",
  DESKTOP_FIREFOX:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:128.0) Gecko/20100101 Firefox/128.0",
  INSTAGRAM:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 337.0.0.0",
  IPHONE_CHROME:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.0.0 Mobile/15E148 Safari/604.1",
  IPHONE_SAFARI:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  MAC_SAFARI:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
} as const;

const on = (
  userAgent: string,
  { installable = false, standalone = false, touch = false } = {}
) => installPlatform({ installable, standalone, touch, userAgent });

describe("installPlatform", () => {
  it.each([
    [UA.IPHONE_SAFARI, PWA.PLATFORM.IOS],
    [UA.IPHONE_CHROME, PWA.PLATFORM.IOS],
    [UA.MAC_SAFARI, PWA.PLATFORM.MAC_SAFARI],
  ])("names the steps for %s", (userAgent, platform) => {
    expect(on(userAgent)).toBe(platform);
  });

  it.each([UA.DESKTOP_CHROME, UA.DESKTOP_EDGE, UA.ANDROID_CHROME])(
    "offers the Install button where the browser offered its prompt: %s",
    (userAgent) => {
      expect(on(userAgent, { installable: true })).toBe(
        PWA.PLATFORM.INSTALLABLE
      );
    }
  );

  it("reads iPadOS, which reports a Mac, as iOS by its touch screen", () => {
    expect(on(UA.MAC_SAFARI, { touch: true })).toBe(PWA.PLATFORM.IOS);
  });

  // Chrome holds its prompt back until the App is installable, and once it
  // is installed.
  it.each([
    UA.DESKTOP_FIREFOX,
    UA.ANDROID_SAMSUNG,
    UA.INSTAGRAM,
    UA.DESKTOP_CHROME,
    UA.DESKTOP_EDGE,
    UA.ANDROID_CHROME,
  ])("names none where the hint has nothing to offer: %s", (userAgent) => {
    expect(on(userAgent)).toBeNull();
  });

  it("names none in an in-app browser, prompt or not", () => {
    expect(on(UA.INSTAGRAM, { installable: true })).toBeNull();
  });

  it("names none for a page already opened from the home screen", () => {
    expect(on(UA.IPHONE_SAFARI, { standalone: true })).toBeNull();
  });
});
