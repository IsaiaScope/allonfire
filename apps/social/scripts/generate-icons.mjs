import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");
const appDir = join(__dirname, "..", "src", "app");
const svgSource = join(publicDir, "allonfire-social.svg");

const svgBuffer = readFileSync(svgSource);

const targets = [
  { name: "favicon-32x32.png", size: 32, dir: publicDir },
  { name: "icon-192x192.png", size: 192, dir: publicDir },
  { name: "icon-512x512.png", size: 512, dir: publicDir },
  { name: "apple-icon-180x180.png", size: 180, dir: publicDir },
  { name: "apple-icon.png", size: 180, dir: appDir },
  { name: "favicon.ico", size: 32, dir: appDir },
];

for (const { name, size, dir } of targets) {
  const output = join(dir, name);

  if (name.endsWith(".ico")) {
    // ICO is just a PNG at 32x32 — browsers accept PNG-in-ICO
    await sharp(svgBuffer).resize(size, size).png().toFile(output);
  } else {
    await sharp(svgBuffer).resize(size, size).png().toFile(output);
  }

  console.log(`✓ ${name} (${size}×${size})`);
}

// Generate OG image (1200×630) with the icon centered on dark background
const ogWidth = 1200;
const ogHeight = 630;
const iconSize = 400;
const iconBuffer = await sharp(svgBuffer)
  .resize(iconSize, iconSize)
  .png()
  .toBuffer();

await sharp({
  create: {
    width: ogWidth,
    height: ogHeight,
    channels: 4,
    background: { r: 21, g: 21, b: 21, alpha: 1 },
  },
})
  .composite([
    {
      input: iconBuffer,
      left: Math.round((ogWidth - iconSize) / 2),
      top: Math.round((ogHeight - iconSize) / 2),
    },
  ])
  .png()
  .toFile(join(appDir, "opengraph-image.png"));

console.log("✓ opengraph-image.png (1200×630)");
console.log("\nAll icons generated successfully!");
