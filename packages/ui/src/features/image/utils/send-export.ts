import { HTTP } from "@allonfire/core/features/http/constants/http";
import { IMAGE as STORED_IMAGE } from "@allonfire/storage/features/image/constants/image";
import { IMAGE } from "../constants/image";
import type { ExportResult } from "../constants/image-schema";

const { RESULT } = IMAGE.EXPORT;

const isNamed = (error: unknown, name: string): boolean =>
  typeof error === "object" &&
  error !== null &&
  "name" in error &&
  error.name === name;

/**
 * Whether this browser can send an Export as a file (`navigator.canShare`
 * with a JPEG, probed with an empty one): where it cannot, Share is not shown.
 * False where `navigator` or the method is missing (Firefox on desktop).
 */
export const canShareExport = (): boolean =>
  typeof navigator !== "undefined" &&
  navigator.canShare?.({
    files: [
      new File([""], IMAGE.EXPORT.PROBE_NAME, {
        type: STORED_IMAGE.EXPORT.CONTENT_TYPE,
      }),
    ],
  }) === true;

/**
 * The Export at `url`, fetched with the Session as one JPEG file named `name`.
 * Never throws: `GONE` is a 404 (trying again cannot work), `null` any other
 * refused answer, a network failure (reported) or `signal` aborting, which the
 * caller tells apart by the signal.
 */
export const prepareExport = async (
  url: string,
  name: string,
  signal?: AbortSignal
): Promise<File | typeof RESULT.GONE | null> => {
  try {
    const response = await fetch(url, {
      credentials: "include",
      ...(signal && { signal }),
    });
    if (!response.ok) {
      return response.status === HTTP.STATUS.NOT_FOUND ? RESULT.GONE : null;
    }
    const body = await response.blob();
    // Whoever asked has gone: nothing is saved or opened over another page.
    return signal?.aborted
      ? null
      : new File([body], name, { type: STORED_IMAGE.EXPORT.CONTENT_TYPE });
  } catch (error) {
    if (!isNamed(error, IMAGE.EXPORT.ABORT_ERROR)) {
      reportError(error);
    }
    return null;
  }
};

/**
 * `file` handed to the share sheet: no link, no title, no text. It calls
 * `share()` before it first waits, so a file already in hand is shared inside
 * the tap. Never throws: `BLOCKED` is a browser that wants a new tap first
 * (the one that asked is too old).
 */
export const shareFile = async (file: File): Promise<ExportResult> => {
  try {
    if (!navigator.canShare?.({ files: [file] })) {
      return RESULT.FAILED;
    }
    await navigator.share({ files: [file] });
    return RESULT.DONE;
  } catch (error) {
    if (isNamed(error, IMAGE.EXPORT.ABORT_ERROR)) {
      return RESULT.CANCELLED;
    }
    if (isNamed(error, IMAGE.EXPORT.NOT_ALLOWED_ERROR)) {
      return RESULT.BLOCKED;
    }
    reportError(error);
    return RESULT.FAILED;
  }
};

/**
 * The Export saved under `name`. It is fetched first and saved from its own
 * `blob:` address: a plain link to the API, another origin, ignores `download`,
 * so a refusal (401, 429) would replace the App with the error's JSON.
 */
export const downloadExport = async (
  url: string,
  name: string,
  signal?: AbortSignal
): Promise<ExportResult> => {
  const file = await prepareExport(url, name, signal);
  if (!file) {
    return signal?.aborted ? RESULT.CANCELLED : RESULT.FAILED;
  }
  if (file === RESULT.GONE) {
    return file;
  }
  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = file.name;
  link.click();
  setTimeout(
    () => URL.revokeObjectURL(link.href),
    IMAGE.EXPORT.REVOKE_AFTER_MS
  );
  return RESULT.DONE;
};
