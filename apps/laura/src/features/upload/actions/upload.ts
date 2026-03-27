"use server";

import { createPhoto } from "@allonfire/database";
import { processPhoto, uploadFile } from "@allonfire/storage";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

type UploadResult =
  | { success: true; count: number }
  | { success: false; error: string };

export async function uploadPhotosAction(
  formData: FormData
): Promise<UploadResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { success: false, error: "Not authenticated" };
  }

  const files = formData.getAll("photos") as File[];

  if (files.length === 0) {
    return { success: false, error: "No files provided" };
  }

  for (const file of files) {
    if (!ACCEPTED_TYPES.has(file.type)) {
      return {
        success: false,
        error: `Invalid file type: ${file.name}. Only PNG, JPEG, and WebP are accepted.`,
      };
    }
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `File too large: ${file.name}. Maximum size is 10MB.`,
      };
    }
  }

  try {
    let uploadCount = 0;

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const timestamp = Date.now();
      const baseName = `${timestamp}-${uploadCount}`;

      const processed = await processPhoto(buffer);

      const [fullUrl, thumbUrl] = await Promise.all([
        uploadFile(`photos/full/${baseName}.jpg`, processed.full, "image/jpeg"),
        uploadFile(
          `photos/thumb/${baseName}.jpg`,
          processed.thumbnail,
          "image/jpeg"
        ),
      ]);

      await createPhoto({
        url: fullUrl,
        thumbnailUrl: thumbUrl,
        width: processed.width,
        height: processed.height,
        blurHash: processed.blurHash,
        uploadedBy: session.user.id,
      });

      uploadCount++;
    }

    return { success: true, count: uploadCount };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return { success: false, error: message };
  }
}
