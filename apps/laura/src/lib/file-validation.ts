export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_TOTAL_SIZE = 50 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export const ACCEPTED_INPUT_STRING = [...ACCEPTED_IMAGE_TYPES].join(",");

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    return "invalidType";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "fileTooLarge";
  }
  return null;
}
