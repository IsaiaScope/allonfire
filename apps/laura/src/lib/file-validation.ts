export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    return `Invalid file type: ${file.name}. Only PNG, JPEG, WebP, and HEIC are accepted.`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `File too large: ${file.name}. Maximum size is 10MB.`;
  }
  return null;
}
