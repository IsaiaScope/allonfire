// @module-tag unit
import { UNIT } from "../../../../shared/constants/units";
import { STORAGE_AREA } from "../../../../shared/utils/storage";
import { PWA } from "../constants/pwa";

const MS_PER_DAY = UNIT.SECONDS_PER_DAY * UNIT.MS_PER_SECOND;
const NOW = Date.UTC(2026, 9, 16);
const daysAgo = (days: number) => NOW - days * MS_PER_DAY;

/** A Web Storage area backed by a Map, as the browser's would be. */
const fakeStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
};

/** The module as a new page load finds it: nothing asked yet this load. */
const pageLoad = async () => {
  vi.resetModules();
  return await import("../install-hint-state");
};

/** A visitor coming back: an earlier load already counted as the first. */
const returningVisitor = async () => {
  (await pageLoad()).firstLoad();
  return await pageLoad();
};

beforeEach(() => {
  vi.stubGlobal(STORAGE_AREA.LOCAL, fakeStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("firstLoad", () => {
  it("is true once, on the visitor's first load, and false after", async () => {
    const { firstLoad } = await pageLoad();
    expect(firstLoad()).toBe(true);
    expect(firstLoad()).toBe(false);
  });

  // Where nothing can be kept, every load would be a first: the hint never
  // nags a visitor whose dismissal it cannot remember.
  it("stays true where storage keeps nothing", async () => {
    vi.stubGlobal(STORAGE_AREA.LOCAL, undefined);
    const { firstLoad } = await pageLoad();
    expect(firstLoad()).toBe(true);
    expect(firstLoad()).toBe(true);
  });
});

describe("hintMayShow", () => {
  // Asked again in the same load (a soft navigation, Strict Mode's second
  // effect), the first load stays the first.
  it("never shows during the visitor's first load", async () => {
    const { hintMayShow } = await pageLoad();
    expect(hintMayShow(NOW)).toBe(false);
    expect(hintMayShow(NOW)).toBe(false);
  });

  it("shows to a returning visitor who never dismissed it", async () => {
    const { hintMayShow } = await returningVisitor();
    expect(hintMayShow(NOW)).toBe(true);
  });

  it("stays away for a year after a dismissal", async () => {
    const { dismissHint, hintMayShow } = await returningVisitor();
    dismissHint(daysAgo(PWA.INSTALL_HINT.QUIET_DAYS - 1));
    expect(hintMayShow(NOW)).toBe(false);
  });

  it("shows again once the year is over", async () => {
    const { dismissHint, hintMayShow } = await returningVisitor();
    dismissHint(daysAgo(PWA.INSTALL_HINT.QUIET_DAYS));
    expect(hintMayShow(NOW)).toBe(true);
  });

  // The dismissal's time before it was kept as JSON: a bare number reads
  // the same.
  it("reads a dismissal kept as a bare number", async () => {
    const { hintMayShow } = await returningVisitor();
    localStorage.setItem(PWA.INSTALL_HINT.STORAGE_KEY.DISMISSED, String(NOW));
    expect(hintMayShow(NOW)).toBe(false);
  });

  it("never shows where storage keeps nothing", async () => {
    vi.stubGlobal(STORAGE_AREA.LOCAL, undefined);
    const { hintMayShow } = await returningVisitor();
    expect(hintMayShow(NOW)).toBe(false);
  });
});
