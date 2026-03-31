"use server";

import { checkMutationAccess } from "@allonfire/auth/guard";
import { createPhoto } from "@allonfire/database";
import { processPhoto, uploadFile } from "@allonfire/storage";
import { auth } from "@/lib/auth";
import { validateImageFile } from "@/lib/file-validation";

type UploadResult =
  | { success: true; count: number }
  | { success: false; error: string };

export async function uploadPhotosAction(
  formData: FormData
): Promise<UploadResult> {
  const access = await checkMutationAccess(auth);
  if (!access.allowed) {
    return { success: false, error: access.reason };
  }
  const { session } = access;

  const files = formData.getAll("photos") as File[];

  if (files.length === 0) {
    return { success: false, error: "No files provided" };
  }

  for (const file of files) {
    const validationError = validateImageFile(file);
    if (validationError) {
      return { success: false, error: validationError };
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
