import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderGalleryHtml } from "./gallery-render";

export function packageRoot(): string {
  return dirname(dirname(dirname(fileURLToPath(import.meta.url))));
}

export function galleryPath(): string {
  return join(packageRoot(), "prototype", "index.html");
}

export function buildGallery(): string {
  const outputPath = galleryPath();
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, renderGalleryHtml());
  return outputPath;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.stdout.write(`${buildGallery()}\n`);
}
