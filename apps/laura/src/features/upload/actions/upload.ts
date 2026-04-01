"use server";

import { checkMutationAccess } from "@allonfire/auth/guard";
import { createPhoto } from "@allonfire/database";
import { processPhoto, uploadFile } from "@allonfire/storage";
import { auth } from "@/lib/auth";
import { validateImageFile } from "@/lib/file-validation";

type UploadResult = { success: true } | { success: false; error: string };

export async function uploadPhotoAction(
  formData: FormData
): Promise<UploadResult> {
  const access = await checkMutationAccess(auth);
  if (!access.allowed) {
    return { success: false, error: access.reason };
  }
  const { session } = access;

  const file = formData.get("photo") as File | null;
  if (!file) {
    return { success: false, error: "noFile" };
  }

  const validationError = validateImageFile(file);
  if (validationError) {
    return { success: false, error: validationError };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const baseName = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

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

    return { success: true };
  } catch {
    return { success: false, error: "uploadFailed" };
  }
}
