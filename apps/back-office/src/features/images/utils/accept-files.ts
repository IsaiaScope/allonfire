import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import type { ImageFieldMessages } from "./image-form-schema";

/** Why a picked file was left out: a key of the form's field messages. */
export type FileRefusal = keyof Pick<
  ImageFieldMessages,
  "fileTooLarge" | "tooManyFiles" | "totalTooLarge"
>;

/**
 * Which of the picked `files` still fit in one upload, given what the form
 * already `held`: at most `IMAGE.LIMIT.FILES_PER_UPLOAD` files, each at most
 * `FILE_BYTES`, all together at most `UPLOAD_BYTES`. A file that does not fit
 * is left out and the first reason is told; the API checks again and is the
 * judge.
 */
export const acceptFiles = (
  held: { bytes: number; count: number },
  files: readonly File[]
): { accepted: File[]; refused: FileRefusal | null } => {
  const accepted: File[] = [];
  let refused: FileRefusal | null = null;
  let { bytes, count } = held;
  for (const file of files) {
    let reason: FileRefusal | null = null;
    if (count >= IMAGE.LIMIT.FILES_PER_UPLOAD) {
      reason = "tooManyFiles";
    } else if (file.size > IMAGE.LIMIT.FILE_BYTES) {
      reason = "fileTooLarge";
    } else if (bytes + file.size > IMAGE.LIMIT.UPLOAD_BYTES) {
      reason = "totalTooLarge";
    }
    if (reason) {
      refused ??= reason;
    } else {
      accepted.push(file);
      bytes += file.size;
      count += 1;
    }
  }
  return { accepted, refused };
};
