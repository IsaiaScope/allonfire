// @module-tag unit
import { z } from "zod";
import { STORAGE_AREA, storageItem } from "../storage";

const KEY = "aof:test";
const item = storageItem(KEY, z.object({ at: z.number() }));

/** A Web Storage area backed by a Map, as the browser's would be. */
const fakeStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
};
const throwing = () => {
  throw new Error("SecurityError");
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("storageItem", () => {
  it("reads back what it wrote, as JSON", () => {
    const storage = fakeStorage();
    vi.stubGlobal(STORAGE_AREA.LOCAL, storage);
    item.write({ at: 1 });
    expect(storage.getItem(KEY)).toBe('{"at":1}');
    expect(item.read()).toEqual({ at: 1 });
  });

  it("reads nothing once removed", () => {
    vi.stubGlobal(STORAGE_AREA.LOCAL, fakeStorage());
    item.write({ at: 1 });
    item.remove();
    expect(item.read()).toBeNull();
  });

  it("keeps each area apart", () => {
    vi.stubGlobal(STORAGE_AREA.LOCAL, fakeStorage());
    vi.stubGlobal(STORAGE_AREA.SESSION, fakeStorage());
    // The same key and schema, so only the area tells them apart.
    const session = storageItem(
      KEY,
      z.object({ at: z.number() }),
      STORAGE_AREA.SESSION
    );
    session.write({ at: 1 });
    expect(item.read()).toBeNull();
    expect(session.read()).toEqual({ at: 1 });
  });

  it.each(["not json", '{"at":"soon"}'])(
    "reads text that is not JSON or fails the schema as nothing: %s",
    (text) => {
      const storage = fakeStorage();
      storage.setItem(KEY, text);
      vi.stubGlobal(STORAGE_AREA.LOCAL, storage);
      expect(item.read()).toBeNull();
    }
  );

  // A private window, a full quota: the methods throw.
  it("forgets instead of throwing when the storage refuses", () => {
    vi.stubGlobal(STORAGE_AREA.LOCAL, {
      getItem: throwing,
      removeItem: throwing,
      setItem: throwing,
    });
    expect(item.read()).toBeNull();
    expect(() => item.write({ at: 1 })).not.toThrow();
    expect(() => item.remove()).not.toThrow();
  });

  // Blocked site data: merely reading `window.localStorage` throws; on the
  // server there is none.
  it("forgets instead of throwing when the storage is out of reach", () => {
    Object.defineProperty(globalThis, STORAGE_AREA.LOCAL, {
      configurable: true,
      get: throwing,
    });
    expect(item.read()).toBeNull();
    expect(() => item.write({ at: 1 })).not.toThrow();
    Reflect.deleteProperty(globalThis, STORAGE_AREA.LOCAL);
    expect(item.read()).toBeNull();
  });
});
