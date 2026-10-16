// @module-tag integration
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildServiceWorker } from "../build-service-worker";
import { PWA } from "../constants/pwa";

const BUILD_ID = "build-123";
const CHUNK = "chunks/app.js";
let appDir = "";

beforeEach(async () => {
  appDir = await mkdtemp(join(tmpdir(), "aof-pwa-"));
  await mkdir(join(appDir, ".next/static/chunks"), { recursive: true });
  await mkdir(join(appDir, "public"));
  await writeFile(join(appDir, ".next/static", CHUNK), "console.log(1);");
  // exFAT's AppleDouble sidecars are never precached.
  await writeFile(join(appDir, ".next/static/chunks/._app.js"), "junk");
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
        'self.AOF_PWA = {"defaultLanguage":"en","offline":"/offline"};'
      )
    ).toBe(true);
  });

  it("precaches Next's static files and each language's Offline page", async () => {
    const source = await worker();
    expect(source).toContain(`/_next/static/${CHUNK}`);
    expect(source).not.toContain("._app.js");
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
