// @module-tag integration
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { AOFBaseViewport } from "@allonfire/core/features/next/metadata/utils/aof-base-viewport";
import { AOFThemeProvider } from "@allonfire/core/features/next/providers/components/aof-theme-provider";
import { useCallback } from "react";
import { render } from "vitest-browser-react";
import { useAOFColorScheme } from "../../../shared/hooks/use-aof-theme-switch";
import { AOFThemeColor } from "../components/aof-theme-color";

const { DARK, LIGHT } = METADATA.COLOR_SCHEME;

const GROUND = {
  [DARK]: { background: "#101010" },
  [LIGHT]: { background: "#f0f0f0" },
};

const TAGS = `meta[name="${METADATA.THEME_COLOR.NAME}"]`;

const tags = () => [...document.querySelectorAll<HTMLMetaElement>(TAGS)];

/** The colour a browser takes: the first tag whose media matches the device. */
const barColor = () =>
  tags().find((tag) => !tag.media || matchMedia(tag.media).matches)?.content;

/** The two tags Next writes from an App's viewport, one per device scheme. */
const writeViewportTags = () => {
  for (const { color, media } of AOFBaseViewport({ schemeColors: GROUND })
    .themeColor) {
    const tag = document.createElement("meta");
    tag.name = METADATA.THEME_COLOR.NAME;
    tag.media = media;
    tag.content = color;
    document.head.append(tag);
  }
};

const written = () => tags().map((tag) => [tag.media, tag.content]);

const Choose = () => {
  const { setScheme } = useAOFColorScheme();
  const chooseDark = useCallback(() => setScheme(DARK), [setScheme]);
  const chooseLight = useCallback(() => setScheme(LIGHT), [setScheme]);
  return (
    <>
      <button onClick={chooseDark} type="button">
        {DARK}
      </button>
      <button onClick={chooseLight} type="button">
        {LIGHT}
      </button>
    </>
  );
};

const renderThemed = () =>
  render(
    <AOFThemeProvider>
      <AOFThemeColor />
      <Choose />
    </AOFThemeProvider>
  );

describe("AOFThemeColor", () => {
  beforeEach(() => {
    localStorage.clear();
    // The last test's theme would answer the next one's wait for it.
    document.documentElement.classList.remove(DARK, LIGHT);
  });

  afterEach(() => {
    for (const tag of tags()) {
      tag.remove();
    }
  });

  it("gives the browser's bars the theme on screen, whatever the device's", async () => {
    writeViewportTags();
    const screen = await renderThemed();

    const choose = async (scheme: typeof DARK | typeof LIGHT) => {
      await screen.getByRole("button", { name: scheme }).click();
      await expect.poll(barColor).toBe(GROUND[scheme].background);
    };

    await choose(DARK);
    await choose(LIGHT);
    await choose(DARK);
  });

  it("leaves Next's own tags as they were, and takes its own away with it", async () => {
    writeViewportTags();
    const before = written();
    const screen = await renderThemed();
    await screen.getByRole("button", { name: DARK }).click();
    await expect.poll(() => tags().length).toBe(before.length + 1);
    expect(written().slice(1)).toEqual(before);

    screen.unmount();

    await expect.poll(written).toEqual(before);
  });

  it("adds no tag to a page that names no theme colour", async () => {
    const screen = await renderThemed();
    await screen.getByRole("button", { name: DARK }).click();
    await expect
      .poll(() => document.documentElement.classList.contains(DARK))
      .toBe(true);

    expect(tags()).toHaveLength(0);
  });
});
