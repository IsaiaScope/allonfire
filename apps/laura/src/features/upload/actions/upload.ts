"use server";

import { checkMutationAccess } from "@allonfire/auth/guard";
import { createPhoto } from "@allonfire/database/features/laura/photo.service";
import { processPhoto, uploadFile } from "@allonfire/storage";
import { auth } from "@/lib/auth";
import { validateImageFile } from "@/lib/file-validation";

type UploadResult = { success: true } | { success: false; error: string };

export async function uploadPhotoAction(
  formData: FormData
): Promise<UploadResult> {
  const access = await checkMutationAccess(auth);
  if (!access.allowed) {
    return { error: access.reason, success: false };
  }
  const { session } = access;

  const file = formData.get("photo") as File | null;
  if (!file) {
    return { error: "noFile", success: false };
  }

  const validationError = validateImageFile(file);
  if (validationError) {
    return { error: validationError, success: false };
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
      blurHash: processed.blurHash,
      height: processed.height,
      thumbnailUrl: thumbUrl,
      uploadedBy: session.user.id,
      url: fullUrl,
      width: processed.width,
    });

    return { success: true };
  } catch {
    return { error: "uploadFailed", success: false };
  }
}
