import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { createPhoto, getPhotoCount, prisma } from "@allonfire/database";
import { processPhoto, uploadFile } from "@allonfire/storage";

const SEED_DIR = join(import.meta.dirname, "../seed-photos");

const IMAGE_EXTENSIONS = new Set([".heic", ".heif", ".jpg", ".jpeg", ".png"]);

async function getFirstUserId(): Promise<string> {
  const user = await prisma.user.findFirst({
    select: { id: true },
  });

  if (!user) {
    throw new Error(
      "No users found in the database. Create a user first via the app."
    );
  }

  return user.id;
}

async function main() {
  const existingCount = await getPhotoCount();

  if (existingCount > 0) {
    console.log(`Database already has ${existingCount} photos. Skipping seed.`);
    console.log("  Delete existing photos first if you want to re-seed.");
    process.exit(0);
  }

  const allFiles = await readdir(SEED_DIR);
  const imageFiles = allFiles
    .filter((f) => IMAGE_EXTENSIONS.has(extname(f).toLowerCase()))
    .sort((a, b) => {
      const numA = Number.parseInt(a, 10);
      const numB = Number.parseInt(b, 10);
      if (Number.isNaN(numA) || Number.isNaN(numB)) {
        return a.localeCompare(b);
      }
      return numA - numB;
    });

  if (imageFiles.length === 0) {
    console.log(`No image files found in ${SEED_DIR}`);
    console.log("Copy your photos there first:");
    console.log("  cp '/path/to/laura memory/'*.heic apps/laura/seed-photos/");
    process.exit(1);
  }

  console.log(`Found ${imageFiles.length} images to seed`);

  const userId = await getFirstUserId();
  console.log(`Using user ID: ${userId}\n`);

  let processed = 0;
  let failed = 0;

  for (const filename of imageFiles) {
    const filePath = join(SEED_DIR, filename);

    try {
      const buffer = await readFile(filePath);
      const photo = await processPhoto(buffer);

      const timestamp = Date.now();
      const baseName = `seed-${timestamp}-${processed}`;

      const [fullUrl, thumbUrl] = await Promise.all([
        uploadFile(`photos/full/${baseName}.jpg`, photo.full, "image/jpeg"),
        uploadFile(
          `photos/thumb/${baseName}.jpg`,
          photo.thumbnail,
          "image/jpeg"
        ),
      ]);

      await createPhoto({
        url: fullUrl,
        thumbnailUrl: thumbUrl,
        width: photo.width,
        height: photo.height,
        blurHash: photo.blurHash,
        uploadedBy: userId,
      });

      processed++;
      console.log(
        `[${processed}/${imageFiles.length}] ${filename} (${photo.width}x${photo.height})`
      );
    } catch (error) {
      failed++;
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`[FAIL] ${filename}: ${message}`);
    }
  }

  console.log(`\nDone! Processed: ${processed}, Failed: ${failed}`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
