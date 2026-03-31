import { prisma } from "@allonfire/database";
import sharp from "sharp";

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT ?? "";
const MINIO_BUCKET = process.env.MINIO_BUCKET ?? "";

async function downloadPhoto(url: string): Promise<Buffer> {
  const key = url.replace("/storage/", "");
  const res = await fetch(`${MINIO_ENDPOINT}/${MINIO_BUCKET}/${key}`);

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const photos = await prisma.photo.findMany({
    select: { id: true, url: true, width: true, height: true },
  });

  console.log(`Found ${photos.length} photos to check\n`);

  let fixed = 0;
  let skipped = 0;
  let failed = 0;

  for (const photo of photos) {
    try {
      const buffer = await downloadPhoto(photo.url);
      const metadata = await sharp(buffer).metadata();

      if (!(metadata.width && metadata.height)) {
        throw new Error("Unable to read dimensions");
      }

      const { width, height } = metadata;

      if (width === photo.width && height === photo.height) {
        skipped++;
        continue;
      }

      await prisma.photo.update({
        where: { id: photo.id },
        data: { width, height },
      });

      fixed++;
      console.log(
        `[FIXED] ${photo.id}: ${photo.width}x${photo.height} → ${width}x${height}`
      );
    } catch (error) {
      failed++;
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`[FAIL] ${photo.id}: ${message}`);
    }
  }

  console.log(
    `\nDone! Fixed: ${fixed}, Skipped: ${skipped}, Failed: ${failed}`
  );
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
