import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import {
  type Indexing,
  METADATA,
} from "@allonfire/core/features/metadata/constants/metadata";
import { pageTitle } from "@allonfire/core/features/metadata/utils/page-title";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { logoFile } from "@allonfire/core/features/next/metadata/utils/aof-logo-route";
import { AOFLaunchScreenLinks } from "@allonfire/core/features/next/metadata/utils/launch-screens";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { expect, test } from "@playwright/test";
import type { AppDescriptor } from "../../../navigation/types/app-descriptor";

const { SIGN_IN } = AUTH.PAGE;
const COLOR_SCHEMES = objectValues(METADATA.COLOR_SCHEME).length;
/** iOS must not turn a number into a phone link. */
const NO_TELEPHONE = /telephone=no/;
const THEME_COLOR_TAG = `meta[name="${METADATA.THEME_COLOR.NAME}"]`;
/** The viewport drawn edge to edge, so the safe-area insets are real. */
const EDGE_TO_EDGE = /viewport-fit=cover/;
const NOT_FOUND = SHARED_TRANSLATIONS[I18N.DEFAULT_LANGUAGE].Common.NotFound;
const SIGN_IN_TITLE = SHARED_TRANSLATIONS.en.Common.Auth.SignIn.submit;

const MANIFEST_ICONS = objectValues(METADATA.ICON.MANIFEST);
const ICONS = [
  { path: METADATA.PATH.ICON, type: HTTP.CONTENT_TYPE.SVG },
  { path: METADATA.PATH.APPLE_ICON, type: HTTP.CONTENT_TYPE.PNG },
  ...MANIFEST_ICONS.map(({ file }) => ({
    path: `${METADATA.PATH.MANIFEST_ICON}/${file}`,
    type: HTTP.CONTENT_TYPE.PNG,
  })),
  {
    path: `${METADATA.PATH.LOGO}/${logoFile(METADATA.LOGO.LAYOUT.HORIZONTAL, METADATA.LOGO.SCHEME.AUTO)}`,
    type: HTTP.CONTENT_TYPE.SVG,
  },
];

// WhatsApp reads up to 600 KB; half of that keeps every preview bot happy.
const SHARE_IMAGE_MAX_BYTES = 300_000;
const SHARE_IMAGES = ["", "/it"].flatMap((locale) =>
  [METADATA.PATH.OPENGRAPH_IMAGE, METADATA.PATH.TWITTER_IMAGE].map(
    (path) => `${locale}${path}`
  )
);
const TWITTER_IMAGE_URL = new RegExp(METADATA.PATH.TWITTER_IMAGE);

const LAUNCH_LINKS = AOFLaunchScreenLinks();

type Options = {
  app: AppDescriptor;
  /** The App's address, as the browser reaches it. */
  baseUrl: string;
  /** The App's `Metadata.description` in English. */
  description: string;
  /** The Design's light `--background`, as the browser reports it. */
  ground: string;
  /** Whether search engines may list the App's pages. */
  indexing: Indexing;
};

const pageHeadTests = ({ app, baseUrl, description, indexing }: Options) => {
  test("gives Sign in a complete head", async ({ page }) => {
    const response = await page.goto(SIGN_IN);
    const meta = (selector: string) => page.locator(selector).first();
    await expect(page).toHaveTitle(pageTitle(SIGN_IN_TITLE, app.name));
    if (indexing === METADATA.INDEXING.UNINDEXED) {
      expect(response?.headers()[HTTP.HEADER.X_ROBOTS_TAG]).toBe(
        METADATA.ROBOTS.NOINDEX
      );
      await expect(meta('meta[name="robots"]')).toHaveAttribute(
        "content",
        METADATA.ROBOTS.NOINDEX
      );
    } else {
      expect(response?.headers()[HTTP.HEADER.X_ROBOTS_TAG]).toBeUndefined();
    }
    await expect(meta('meta[name="description"]')).toHaveAttribute(
      "content",
      description
    );
    await expect(meta('meta[property="og:url"]')).toHaveAttribute(
      "content",
      `${baseUrl}${SIGN_IN}`
    );
    await expect(meta('meta[property="og:site_name"]')).toHaveAttribute(
      "content",
      app.name
    );
    await expect(meta('meta[property="og:locale"]')).toHaveAttribute(
      "content",
      METADATA.OG_LOCALE.en
    );
    await expect(meta('meta[property="og:locale:alternate"]')).toHaveAttribute(
      "content",
      METADATA.OG_LOCALE.it
    );
    await expect(meta('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      "summary_large_image"
    );
    // Next's tag per device theme, and the one for the theme on screen,
    // first so the browser takes it.
    await expect(page.locator(`${THEME_COLOR_TAG}[media]`)).toHaveCount(
      COLOR_SCHEMES
    );
    await expect(page.locator(THEME_COLOR_TAG)).toHaveCount(COLOR_SCHEMES + 1);
    await expect(meta(THEME_COLOR_TAG)).not.toHaveAttribute("media");
    await expect(meta('meta[name="color-scheme"]')).toHaveAttribute(
      "content",
      METADATA.PAGE_COLOR_SCHEME
    );
    await expect(meta('meta[name="viewport"]')).toHaveAttribute(
      "content",
      EDGE_TO_EDGE
    );
    await expect(
      meta('meta[name="apple-mobile-web-app-capable"]')
    ).toHaveAttribute("content", "yes");
    await expect(
      meta('meta[name="apple-mobile-web-app-status-bar-style"]')
    ).toHaveAttribute("content", "default");
    await expect(meta('meta[name="format-detection"]')).toHaveAttribute(
      "content",
      NO_TELEPHONE
    );
    await expect(
      page.locator('link[rel="apple-touch-startup-image"]')
    ).toHaveCount(LAUNCH_LINKS.length);
  });

  test("localizes the head in Italian", async ({ page }) => {
    await page.goto(`/it${SIGN_IN}`);
    await expect(
      page.locator('meta[property="og:locale"]').first()
    ).toHaveAttribute("content", METADATA.OG_LOCALE.it);
    await expect(
      page.locator('meta[property="og:url"]').first()
    ).toHaveAttribute("content", `${baseUrl}/it${SIGN_IN}`);
  });

  test("serves a robots.txt that allows crawling", async ({ request }) => {
    const body = await (await request.get(METADATA.PATH.ROBOTS)).text();
    expect(body).toContain("Allow: /");
    expect(body).not.toContain("Disallow");
    expect(body).not.toContain("Sitemap");
  });
};

const notFoundTests = ({ app, ground }: Options) => {
  // Paths the proxy skips (a dot, the API prefix): no language owns them.
  for (const unowned of [
    "/no-such-file.png",
    "/zz/deep/no-such-file.png",
    "/api/no-such-route",
    // A language's code in capitals: routes match case-sensitively.
    `/${I18N.DEFAULT_LANGUAGE.toUpperCase()}/no-such-file.png`,
  ]) {
    test(`styles the 404 for ${unowned}, which no language owns`, async ({
      page,
    }) => {
      const response = await page.goto(unowned);
      expect(response?.status()).toBe(HTTP.STATUS.NOT_FOUND);
      await expect(
        page.getByRole("heading", { name: NOT_FOUND.title })
      ).toBeVisible();
      await expect(page).toHaveTitle(pageTitle(NOT_FOUND.title, app.name));
      const background = await page.evaluate(
        () => getComputedStyle(document.body).backgroundColor
      );
      expect(background).toBe(ground);
    });
  }

  test("answers Not Found, titled, for an unknown page in a language", async ({
    page,
  }) => {
    const response = await page.goto("/it/no-such-page");
    // A loading.tsx above the page would stream a 200 shell first.
    expect(response?.status()).toBe(HTTP.STATUS.NOT_FOUND);
    await expect(page).toHaveTitle(
      pageTitle(SHARED_TRANSLATIONS.it.Common.NotFound.title, app.name)
    );
  });
};

const iconTests = ({ app }: Options) => {
  for (const { path, type } of ICONS) {
    test(`serves the icon ${path}`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(HTTP.STATUS.OK);
      expect(response.headers()[HTTP.HEADER.CONTENT_TYPE]).toContain(type);
    });
  }

  test("serves a favicon for whatever asks for it by name", async ({
    request,
  }) => {
    const response = await request.get(METADATA.PATH.FAVICON);
    expect(response.status()).toBe(HTTP.STATUS.OK);
  });

  test("serves the manifest and links it with the icons", async ({
    page,
    request,
  }) => {
    const manifest = await (await request.get(METADATA.PATH.MANIFEST)).json();
    expect(manifest).toMatchObject({
      display: "standalone",
      id: METADATA.PATH.ROOT,
      name: app.name,
      scope: METADATA.PATH.ROOT,
      short_name: app.name,
      start_url: METADATA.PATH.ROOT,
    });
    expect(manifest.icons).toHaveLength(MANIFEST_ICONS.length);

    await page.goto(SIGN_IN);
    await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
    await expect(
      page.locator(`link[rel="icon"][type="${HTTP.CONTENT_TYPE.SVG}"]`)
    ).toHaveCount(1);
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
  });
};

const shareTests = ({ app, baseUrl }: Options) => {
  for (const path of SHARE_IMAGES) {
    test(`serves the link-preview image ${path}`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(HTTP.STATUS.OK);
      expect(response.headers()[HTTP.HEADER.CONTENT_TYPE]).toBe(
        HTTP.CONTENT_TYPE.PNG
      );
      expect((await response.body()).byteLength).toBeLessThan(
        SHARE_IMAGE_MAX_BYTES
      );
    });
  }

  test("links the preview images from the head, with their alt", async ({
    page,
    request,
  }) => {
    await page.goto(SIGN_IN);
    const og = page.locator('meta[property="og:image"]').first();
    await expect(og).toHaveAttribute(
      "content",
      new RegExp(`^${baseUrl}.*${METADATA.PATH.OPENGRAPH_IMAGE}`)
    );
    await expect(
      page.locator('meta[property="og:image:alt"]').first()
    ).toHaveAttribute("content", app.shareImageAlt);
    await expect(
      page.locator('meta[name="twitter:image"]').first()
    ).toHaveAttribute("content", TWITTER_IMAGE_URL);
    const image = await request.get((await og.getAttribute("content")) ?? "");
    expect(image.status()).toBe(HTTP.STATUS.OK);
  });

  // The first and the last: an iPhone in portrait and an iPad in landscape.
  for (const link of [LAUNCH_LINKS[0], LAUNCH_LINKS.at(-1)]) {
    test(`serves the launch screen ${link?.url}`, async ({ request }) => {
      const response = await request.get(link?.url ?? "");
      expect(response.status()).toBe(HTTP.STATUS.OK);
      expect(response.headers()[HTTP.HEADER.CONTENT_TYPE]).toBe(
        HTTP.CONTENT_TYPE.PNG
      );
    });
  }

  test("answers Not Found for a launch screen it does not list", async ({
    request,
  }) => {
    const response = await request.get(
      `${METADATA.PATH.LAUNCH_SCREEN}/unlisted.png`
    );
    expect(response.status()).toBe(HTTP.STATUS.NOT_FOUND);
  });
};

/**
 * What a link, a search engine, a phone's home screen and a crawler read of
 * an App, as Playwright tests: the head of Sign in in both languages, robots,
 * the 404 for paths no language owns, icons, favicon, manifest, link-preview
 * images and launch screens. Call it from the App's `e2e/head.spec.ts`.
 */
export const headSuite = (options: Options) => {
  pageHeadTests(options);
  notFoundTests(options);
  iconTests(options);
  shareTests(options);
};
