// @module-tag integration
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { NEXT } from "../../constants/next";
import { PWA } from "../constants/pwa";
import { buildServiceWorker } from "../utils/build-service-worker";

const BUILD_ID = "build-123";
const CHUNK_DIR = "chunks";
const CHUNK = `${CHUNK_DIR}/app.js`;
/** exFAT's AppleDouble sidecar of the chunk. */
const SIDECAR = "._app.js";
let appDir = "";

beforeEach(async () => {
  appDir = await mkdtemp(join(tmpdir(), "aof-pwa-"));
  const staticDir = join(appDir, NEXT.STATIC_DIR);
  await mkdir(join(staticDir, CHUNK_DIR), { recursive: true });
  await mkdir(dirname(join(appDir, PWA.OUTPUT)));
  await writeFile(join(staticDir, CHUNK), "console.log(1);");
  // exFAT's AppleDouble sidecars are never precached.
  await writeFile(join(staticDir, CHUNK_DIR, SIDECAR), "junk");
});

afterEach(() => rm(appDir, { force: true, recursive: true }));

const worker = async () => {
  await buildServiceWorker({
    appDir,
    buildId: BUILD_ID,
    languages: ["en", "it"],
  });
  return readFile(join(appDir, PWA.OUTPUT), "utf8");
};

describe("buildServiceWorker", () => {
  it("opens the worker with the settings its fallback reads", async () => {
    expect(
      (await worker()).startsWith(
        `self.AOF_PWA = {"defaultLanguage":"en","offline":"${PWA.PATH.OFFLINE}"};`
      )
    ).toBe(true);
  });

  it("precaches Next's static files and each language's Offline page", async () => {
    const source = await worker();
    expect(source).toContain(`${NEXT.STATIC_URL}${CHUNK}`);
    expect(source).not.toContain(SIDECAR);
    expect(source).toContain(`"/en${PWA.PATH.OFFLINE}"`);
    expect(source).toContain(`"/it${PWA.PATH.OFFLINE}"`);
    expect(source).toContain(BUILD_ID);
  });

  // Workbox's own runtime already holds `navigate`, `handlerDidError` and
  // the settings' name; only the inlined fallback reads `.defaultLanguage`.
  it("routes page loads to the network with the Offline page on failure", async () => {
    const source = await worker();
    expect(source).toContain(".defaultLanguage");
  });

  // A page load passes through the worker: preload starts the request while
  // a sleeping worker wakes, so the worker adds no wait.
  it("preloads page loads while the worker starts", async () => {
    expect(await worker()).toContain("navigationPreload");
  });
});
