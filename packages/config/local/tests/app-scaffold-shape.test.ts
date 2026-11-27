// @module-tag unit

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO } from "../repo";

const read = (path: string) => readFileSync(resolve(REPO.ROOT, path), "utf8");

const APPS = ["back-office", "laura"] as const;
type App = (typeof APPS)[number];

const SCAFFOLD_FOLDERS = [
  "src/environment/",
  "src/shared/constants/",
  "src/features/api/",
  "src/features/auth/",
  "src/features/errors/",
  "src/features/i18n/",
  "src/features/metadata/",
  "src/features/navigation/",
  "src/features/pwa/",
  "src/app/",
] as const;
const ROOT_FILES = [
  "src/proxy.ts",
  "src/instrumentation.ts",
  "src/instrumentation-client.ts",
] as const;

const NOT_SOURCE = /(?:^|\/)(?:tests|e2e)\/|\.test\.|(?:^|\/)\._/;
/** A signed-in Section is the App's content; only the frame and its 404 count. */
const SECTION = /\/\(signed-in\)\//;
const SIGNED_IN_SCAFFOLD = /\/\(signed-in\)\/(?:layout|not-found)\.tsx$/;

/** One Design's name for the same binding: the Back Office's file to Laura's. */
const RENAMED = [
  [
    "features/auth/components/ticket-gate.tsx",
    "features/auth/components/ocean-gate.tsx",
  ],
  [
    "features/auth/components/station-sign.tsx",
    "features/auth/components/ocean-sign.tsx",
  ],
  [
    "features/errors/components/station-notice-frame.tsx",
    "features/errors/components/ocean-notice-frame.tsx",
  ],
  ["shared/constants/back-office.ts", "shared/constants/laura.ts"],
  ["shared/constants/back-office-base.ts", "shared/constants/laura-base.ts"],
] as const;

/** Differences on purpose: a Design's dress or an App's content, never a generic binding. */
const ONLY = {
  "back-office": [
    [
      "features/auth/components/departure-board.tsx",
      "Japan: the split-flap board",
    ],
    ["features/auth/constants/reset.ts", "Japan: the reset pages' signage"],
    ["features/auth/constants/sign-in.ts", "Japan: the Sign in's signage"],
    ["features/errors/constants/error-signage.ts", "Japan: the error signage"],
    [
      "features/navigation/components/app-frame.tsx",
      "Japan: the frame's kanji, torii and line slots; Laura's one slot sits in its layout",
    ],
    [
      "features/navigation/components/header-kanji.tsx",
      "Japan: the header's brushed kanji",
    ],
    [
      "features/navigation/components/sidebar-kanji.tsx",
      "Japan: the sidebar's brushed kanji",
    ],
    [
      "features/navigation/components/station-number.tsx",
      "Japan: a Section's station number",
    ],
    [
      "features/navigation/constants/role-seal.ts",
      "Japan: the Role's office stamp",
    ],
    [
      "features/navigation/types/section.ts",
      "content: the Back Office's Section label keys",
    ],
    [
      "features/pwa/constants/pwa-signage.ts",
      "Japan: the install and offline signage",
    ],
    ["shared/constants/action-kanji.ts", "Japan: the buttons' kanji"],
    [
      "shared/constants/copy.ts",
      "content: what the Users and Services pages copy",
    ],
  ],
  laura: [
    ["features/navigation/utils/crumb-art.ts", "Ocean: the breadcrumb's art"],
    ["shared/constants/mascots.ts", "Ocean: the sea creatures"],
  ],
} as const satisfies Record<App, readonly (readonly [string, string])[]>;

/** Bindings both Apps must have. */
const GENERIC = [
  "features/api/utils/api.ts",
  "features/api/utils/server-api.ts",
  "features/i18n/routing.ts",
  "features/i18n/navigation.ts",
  "features/i18n/request.ts",
  "features/i18n/translations/en.json",
  "features/i18n/translations/it.json",
  "features/navigation/components/frame-breadcrumb.tsx",
  "features/navigation/utils/section-row.ts",
  "features/navigation/utils/signed-in-page.tsx",
  "features/pwa/components/install-hint.tsx",
  "features/pwa/components/install-hint-card.tsx",
  "features/pwa/components/offline-banner.tsx",
  "features/pwa/components/offline-card.tsx",
  "features/pwa/components/offline-notice.tsx",
  "features/errors/components/error-notice.tsx",
  "features/errors/components/not-found-notice.tsx",
  "features/auth/components/dressing.tsx",
  "features/metadata/utils/image-fonts.ts",
  "features/metadata/utils/page-information.ts",
  "shared/components/action-dressing.tsx",
  "environment/environment.ts",
  "proxy.ts",
  "instrumentation.ts",
  "instrumentation-client.ts",
  "app/[locale]/sign-in/page.tsx",
  "app/[locale]/forgot-password/page.tsx",
  "app/[locale]/reset-password/page.tsx",
  "app/[locale]/email-verified/page.tsx",
  "app/[locale]/offline/page.tsx",
] as const;

/** A binding is thin: past this, the logic belongs in a package. */
const MAX_BINDING_LINES = 40;
const TRANSLATIONS = /\.json$/;
const PACKAGE_PIECE = /"(@allonfire\/(?:ui|core|auth)\/[^"]+)"/g;

/** Bindings whose package imports differ on purpose, each with its reason. */
const OTHER_IMPORTS: readonly (readonly [string, string])[] = [
  [
    "shared/components/action-dressing.tsx",
    "Laura keys its art and its own enter icon by ui's action names",
  ],
];
/** Bindings longer than the ceiling on purpose, each with its reason. */
const LONGER: readonly (readonly [string, string])[] = [
  [
    "features/pwa/components/install-hint-card.tsx",
    "a drawn card: each Design lays out its own",
  ],
  [
    "shared/components/action-dressing.tsx",
    "Laura dresses every action in two sizes",
  ],
  [
    "environment/environment.ts",
    "one line over: each App declares and inlines its own variables",
  ],
];

/** Every `jscpd:ignore` block Laura holds, each with why Next or the App forces the lines. */
const LAURA_IGNORES = [
  [
    "app/[locale]/email-verified/page.tsx",
    "Next reads a page's exports from its file",
  ],
  [
    "app/[locale]/forgot-password/page.tsx",
    "Next reads a page's exports from its file",
  ],
  [
    "app/[locale]/reset-password/page.tsx",
    "Next reads a page's exports from its file",
  ],
  [
    "app/[locale]/opengraph-image.tsx",
    "Next reads a metadata image's exports from its file",
  ],
  [
    "app/[locale]/twitter-image.tsx",
    "Next reads a metadata image's exports from its file",
  ],
  ["app/apple-icon.tsx", "Next reads the icon's exports from its file"],
  [
    "environment/environment.ts",
    "Next inlines `process.env.NEXT_PUBLIC_*` only where written",
  ],
  [
    "features/api/utils/api-refusal.ts",
    "only an App knows its own API's codes",
  ],
  [
    "features/api/utils/api.ts",
    "only an App knows its own API type and addresses",
  ],
  [
    "features/i18n/request.ts",
    "next-intl reads the request config from this file",
  ],
  [
    "features/navigation/utils/signed-in-page.tsx",
    "each App passes its own loading screen",
  ],
] as const;

const IGNORE_START = "jscpd:ignore-start";
const IGNORE_END = "jscpd:ignore-end";
const REASON = /^\s*(?:\/\/|\*|\{\/\*).{20,}/;
const IMPORT_OR_BLANK = /^(?:import\b|\s|\}|"use |\/\/|\/\*|\*|$)/;

const sources = (app: App) =>
  execFileSync(
    "git",
    [
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
      "--",
      `apps/${app}`,
    ],
    { cwd: REPO.ROOT, encoding: "utf8" }
  )
    .split("\n")
    .filter(
      (path) =>
        path !== "" &&
        !NOT_SOURCE.test(path) &&
        existsSync(resolve(REPO.ROOT, path))
    )
    .map((path) => path.slice(`apps/${app}/`.length));

const isScaffold = (path: string) =>
  ROOT_FILES.some((file) => file === path) ||
  (SCAFFOLD_FOLDERS.some((folder) => path.startsWith(folder)) &&
    !(SECTION.test(path) && !SIGNED_IN_SCAFFOLD.test(path)));

const shape = (app: App) =>
  sources(app)
    .filter(isScaffold)
    .map((path) => path.slice("src/".length));

const shapes = { "back-office": shape("back-office"), laura: shape("laura") };
const only = (app: App): string[] => ONLY[app].map(([path]) => path);
const binding = (app: App, path: string) => read(`apps/${app}/src/${path}`);

const byName = (a: string, b: string) => a.localeCompare(b);

const piecesOf = (text: string) =>
  [
    ...new Set(
      [...text.matchAll(PACKAGE_PIECE)].map(([, piece = ""]) => piece)
    ),
  ].sort(byName);

describe("the two Apps' scaffold", () => {
  it("has the same files in both Apps", () => {
    const renamed = new Map<string, string>(RENAMED);
    const expected = shapes["back-office"]
      .filter((path) => !only("back-office").includes(path))
      .map((path) => renamed.get(path) ?? path);
    const actual = shapes.laura.filter((path) => !only("laura").includes(path));

    expect({
      onlyBackOffice: expected.filter((path) => !actual.includes(path)),
      onlyLaura: actual.filter((path) => !expected.includes(path)),
    }).toEqual({ onlyBackOffice: [], onlyLaura: [] });
  });

  it("lists no difference that is not there", () => {
    const stale = [
      ...only("back-office").filter(
        (path) =>
          !shapes["back-office"].includes(path) || shapes.laura.includes(path)
      ),
      ...only("laura").filter(
        (path) =>
          !shapes.laura.includes(path) || shapes["back-office"].includes(path)
      ),
      ...RENAMED.filter(
        ([from, to]) =>
          !(shapes["back-office"].includes(from) && shapes.laura.includes(to))
      ).map(([from]) => from),
    ];

    expect(stale).toEqual([]);
  });

  it("keeps every generic binding in both", () => {
    const missing = APPS.flatMap((app) =>
      GENERIC.filter(
        (path) => !existsSync(resolve(REPO.ROOT, `apps/${app}/src/${path}`))
      ).map((path) => `${app}: ${path}`)
    );

    expect(missing).toEqual([]);
  });

  it("imports the same package pieces in each binding", () => {
    const listed = OTHER_IMPORTS.map(([path]) => path);
    const different = GENERIC.filter(
      (path) => !(TRANSLATIONS.test(path) || listed.includes(path))
    ).flatMap((path) => {
      const theirs = piecesOf(binding("back-office", path));
      const ours = piecesOf(binding("laura", path));
      const extra = [
        ...theirs
          .filter((p) => !ours.includes(p))
          .map((p) => `Back Office only ${p}`),
        ...ours
          .filter((p) => !theirs.includes(p))
          .map((p) => `Laura only ${p}`),
      ];
      return extra.map((line) => `${path}: ${line}`);
    });

    expect(different).toEqual([]);
  });

  it("keeps each binding thin", () => {
    const listed = LONGER.map(([path]) => path);
    const long = APPS.flatMap((app) =>
      GENERIC.filter(
        (path) => !(TRANSLATIONS.test(path) || listed.includes(path))
      ).flatMap((path) => {
        const lines = binding(app, path).trimEnd().split("\n").length;
        return lines > MAX_BINDING_LINES ? [`${app}: ${path} ${lines}`] : [];
      })
    );

    expect(long).toEqual([]);
  });
});

describe("duplicate code between the Apps", () => {
  it("is scanned in both Apps", () => {
    const config = read(".jscpd.json");
    for (const app of APPS) {
      expect(config).toContain(`"apps/${app}"`);
      expect(config).not.toContain(`"apps/${app}/`);
    }
  });

  const blocks = sources("laura")
    .map((path) => ({
      lines: read(`apps/laura/${path}`).split("\n"),
      path: path.slice("src/".length),
    }))
    .filter(({ lines }) => lines.some((line) => line.includes(IGNORE_START)));

  it("is ignored in Laura only where listed", () => {
    expect(blocks.map(({ path }) => path).sort(byName)).toEqual(
      LAURA_IGNORES.map(([path]) => path).sort(byName)
    );
  });

  it("says why on the line after each ignore starts", () => {
    const silent = blocks.flatMap(({ lines, path }) =>
      lines.flatMap((line, index) =>
        line.includes(IGNORE_START) && !REASON.test(lines[index + 1] ?? "")
          ? [`${path}:${index + 1}`]
          : []
      )
    );

    expect(silent).toEqual([]);
  });

  // A page or binding Next forces is nothing but the forced lines, so its block
  // is the whole file; in a longer one that would hide real copies.
  it("wraps a whole file only in a thin one", () => {
    const whole = blocks
      .filter(({ lines }) => {
        const start = lines.findIndex((line) => line.includes(IGNORE_START));
        const end = lines.findIndex((line) => line.includes(IGNORE_END));
        const outside = [...lines.slice(0, start), ...lines.slice(end + 1)];
        return (
          lines.length > MAX_BINDING_LINES + 1 &&
          outside.every((line) => IMPORT_OR_BLANK.test(line))
        );
      })
      .map(({ path }) => path);

    expect(whole).toEqual([]);
  });
});
