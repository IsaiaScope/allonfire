import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { openBrowser } from "@remotion/renderer";
import { buildGallery, galleryPath, packageRoot } from "./build-gallery";
import { exportTargets } from "./gallery-data";

type CaptureClient = {
  send: (
    method: "Page.captureScreenshot",
    params: {
      captureBeyondViewport: boolean;
      format: "png";
      fromSurface: boolean;
    }
  ) => Promise<{
    value: {
      data: string;
    };
  }>;
};

export function mockupsDir(): string {
  return join(packageRoot(), "mockups");
}

function targetUrl(target: ReturnType<typeof exportTargets>[number]): string {
  const url = new URL(pathToFileURL(galleryPath()).href);
  url.searchParams.set("shot", target.archetype);
  url.searchParams.set("format", target.format);
  url.searchParams.set("mode", target.mode);
  return url.href;
}

export async function exportMockups(): Promise<string[]> {
  buildGallery();
  const outputDir = mockupsDir();
  mkdirSync(outputDir, { recursive: true });

  const browser = await openBrowser("chrome", { logLevel: "error" });
  const outputs: string[] = [];

  try {
    for (const target of exportTargets()) {
      const page = await browser.newPage({
        context: () => null,
        indent: false,
        logLevel: "error",
        onBrowserLog: null,
        onLog: () => undefined,
        pageIndex: 0,
      });
      await page.setViewport({
        deviceScaleFactor: 1,
        height: target.height,
        width: target.width,
      });
      await page.goto({
        timeout: 30_000,
        url: targetUrl(target),
      });
      await page.evaluate(() => document.fonts.ready);

      const client = page._client() as CaptureClient;
      const screenshot = await client.send("Page.captureScreenshot", {
        captureBeyondViewport: false,
        format: "png",
        fromSurface: true,
      });
      const outputPath = join(outputDir, target.fileName);
      writeFileSync(outputPath, Buffer.from(screenshot.value.data, "base64"));
      outputs.push(outputPath);
      await page.close();
    }
  } finally {
    await browser.close({ silent: true });
  }

  return outputs;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  exportMockups()
    .then((outputs) => {
      process.stdout.write(`${outputs.join("\n")}\n`);
    })
    .catch((err) => {
      process.stderr.write(
        `${err instanceof Error ? err.message : String(err)}\n`
      );
      process.exit(1);
    });
}
