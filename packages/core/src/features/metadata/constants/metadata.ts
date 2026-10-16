import { z } from "zod";
import type { ContentLanguage } from "../../i18n/constants/locales";

/**
 * Whether search engines may list an App's pages (CONTEXT.md, Indexing).
 * Unindexed Apps still give link previews: only search listing is refused.
 */
const INDEXING = {
  INDEXED: "indexed",
  UNINDEXED: "unindexed",
} as const;

export const indexingSchema = z.enum(INDEXING);
export type Indexing = z.infer<typeof indexingSchema>;

/** The OS themes `prefers-color-scheme` reports; generated images come in both. */
const COLOR_SCHEME = { DARK: "dark", LIGHT: "light" } as const;

export const colorSchemeSchema = z.enum(COLOR_SCHEME);
export type ColorScheme = z.infer<typeof colorSchemeSchema>;

const LAUNCH_ORIENTATION = {
  LANDSCAPE: "landscape",
  PORTRAIT: "portrait",
} as const;

export const launchOrientationSchema = z.enum(LAUNCH_ORIENTATION);
export type LaunchOrientation = z.infer<typeof launchOrientationSchema>;

/** A device's screen in CSS pixels, portrait, and its pixel ratio. */
export type LaunchDevice = { width: number; height: number; ratio: 2 | 3 };

/**
 * Every iPhone and iPad on iOS/iPadOS 26-27, one entry per CSS size and
 * ratio (checked 2026-10-08: useyourloaf.com iPhone 17 and iPad 2024 sizes,
 * iPhone 18 Pro from its announcement). Add a size when Apple ships one;
 * the launch screens and their links follow.
 */
const LAUNCH_DEVICES = [
  // iPhone
  { height: 956, ratio: 3, width: 440 }, // 16/17 Pro Max
  { height: 932, ratio: 3, width: 430 }, // 14 Pro Max, 15 Plus/Pro Max, 16 Plus
  { height: 926, ratio: 3, width: 428 }, // 12/13 Pro Max, 14 Plus
  { height: 912, ratio: 3, width: 420 }, // Air
  { height: 896, ratio: 3, width: 414 }, // 11 Pro Max
  { height: 896, ratio: 2, width: 414 }, // 11
  { height: 874, ratio: 3, width: 402 }, // 16 Pro, 17, 17 Pro, 18 Pro
  { height: 852, ratio: 3, width: 393 }, // 14 Pro, 15, 15 Pro, 16
  { height: 844, ratio: 3, width: 390 }, // 12, 13, 14, 16e, 17e
  { height: 812, ratio: 3, width: 375 }, // 11 Pro, 12 mini, 13 mini
  { height: 667, ratio: 2, width: 375 }, // SE 2nd/3rd gen
  // iPad
  { height: 1376, ratio: 2, width: 1032 }, // Pro 13" M4/M5
  { height: 1366, ratio: 2, width: 1024 }, // Air 13", Pro 12.9"
  { height: 1210, ratio: 2, width: 834 }, // Pro 11" M4/M5
  { height: 1194, ratio: 2, width: 834 }, // Pro 11" gen 1-4
  { height: 1180, ratio: 2, width: 820 }, // Air 4/5, Air 11", iPad 10th/A16
  { height: 1112, ratio: 2, width: 834 }, // Air 3, Pro 10.5"
  { height: 1080, ratio: 2, width: 810 }, // iPad 8th/9th
  { height: 1133, ratio: 2, width: 744 }, // mini 6/A17 Pro
  { height: 1024, ratio: 2, width: 768 }, // mini 5
] as const satisfies readonly LaunchDevice[];

/** Open Graph wants `language_TERRITORY`; each language's main region. */
const OG_LOCALE = {
  en: "en_US",
  it: "it_IT",
} as const satisfies Record<ContentLanguage, string>;

/**
 * Where Next serves each metadata file, the same in every App. The proxy
 * matcher of each App skips them (a literal there; its test reads these).
 */
const PATH = {
  APPLE_ICON: "/apple-icon",
  FAVICON: "/favicon.ico",
  ICON: "/icon",
  /** The folder of an App's iOS launch screens, one PNG per device and scheme. */
  LAUNCH_SCREEN: "/launch",
  /** The folder of an App's logo as SVG, each layout and scheme, for its pages. */
  LOGO: "/logo",
  MANIFEST: "/manifest.webmanifest",
  /** The folder of the manifest's PNG icons. */
  MANIFEST_ICON: "/manifest-icon",
  OPENGRAPH_IMAGE: "/opengraph-image",
  ROBOTS: "/robots.txt",
  /** The site root: Home, and the manifest's id, scope and start. */
  ROOT: "/",
  SITEMAP: "/sitemap.xml",
  TWITTER_IMAGE: "/twitter-image",
} as const;

/**
 * The PNG icons every App generates. `inset` is the share of the edge the
 * logo fills on its opaque ground: the apple-touch-icon is the square logo
 * edge to edge, as Laura's is (its own ground and margins clear the corners
 * iOS rounds); a maskable icon keeps the logo inside the
 * safe circle a launcher crops to (0.8 of the edge).
 */
const ICON = {
  APPLE: { edge: 180, inset: 1 },
  MANIFEST: {
    LARGE: { edge: 512, file: "large.png", inset: 1, purpose: "any" },
    MASKABLE: {
      edge: 512,
      file: "maskable.png",
      inset: 0.8,
      purpose: "maskable",
    },
    SMALL: { edge: 192, file: "small.png", inset: 1, purpose: "any" },
  },
} as const;

/**
 * An App's logo as its pages show it (`METADATA.PATH.LOGO`): square or
 * horizontal, in either scheme or `auto`, which follows the viewer's theme.
 */
const LOGO = {
  LAYOUT: { HORIZONTAL: "horizontal", SQUARE: "square" },
  SCHEME: { ...COLOR_SCHEME, AUTO: "auto" },
} as const;
export const logoLayoutSchema = z.enum(LOGO.LAYOUT);
export type LogoLayout = z.infer<typeof logoLayoutSchema>;
export const logoSchemeSchema = z.enum(LOGO.SCHEME);
export type LogoScheme = z.infer<typeof logoSchemeSchema>;

/** What an App says about its pages: to search engines, link previews and iOS. */
export const METADATA = {
  COLOR_SCHEME,
  ICON,
  INDEXING,
  LAUNCH: {
    DEVICES: LAUNCH_DEVICES,
    /** The share of a launch screen's shortest edge the App's mark fills. */
    MARK_SHARE: 0.4,
    ORIENTATION: LAUNCH_ORIENTATION,
  },
  LOGO,
  OG_LOCALE,
  PATH,
  /** The robots directive an unindexed App sends, as meta tag and header. */
  ROBOTS: { NOINDEX: "noindex, nofollow" },
  /** The link-preview image: what Open Graph and X both show uncropped. */
  SHARE_IMAGE: { SIZE: { height: 630, width: 1200 } },
} as const;
