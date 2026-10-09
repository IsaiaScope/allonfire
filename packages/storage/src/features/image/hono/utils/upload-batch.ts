import { randomUUID } from "node:crypto";
import { CodedError } from "@allonfire/core/features/errors/coded-error";
import { HTTP_STATUS } from "@allonfire/core/features/http/constants/http";
import { MS_PER_SECOND } from "@allonfire/core/shared/constants/units";
import { createMiddleware } from "hono/factory";
import { IMAGE_FORMAT } from "../../constants/format";
import { MAX_INPUT_MEGAPIXELS } from "../../prepare/constants/limits";
import {
  ImageTooLargeError,
  type PreparedImage,
  UnsupportedImageError,
} from "../../prepare/prepare-image";
import { IMAGE_ERROR_CODE } from "../constants/errors";
import { UPLOAD_TIMEOUT_MS } from "../constants/limits";
import type { UploadItem } from "../constants/schemas";
import type { ImageDeps } from "./deps";

/** The file bytes as sharp reads them; a decode failure is the client's 415, too many pixels a 413. */
const prepareFile = async (deps: ImageDeps, file: File) => {
  try {
    return await deps.prepare(Buffer.from(await file.arrayBuffer()));
  } catch (error) {
    if (error instanceof ImageTooLargeError) {
      throw new CodedError(
        {
          code: IMAGE_ERROR_CODE.IMAGE_TOO_LARGE,
          status: HTTP_STATUS.PAYLOAD_TOO_LARGE,
          values: { limit: MAX_INPUT_MEGAPIXELS },
        },
        { cause: error }
      );
    }
    if (error instanceof UnsupportedImageError) {
      throw new CodedError(
        {
          code: IMAGE_ERROR_CODE.UNSUPPORTED_IMAGE,
          status: HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE,
        },
        { cause: error }
      );
    }
    throw error;
  }
};

type PreparedItem = UploadItem & { image: PreparedImage; key: string };

/**
 * One at a time: sharp decodes the whole image, and the VPS has no swap. A
 * reduce chain, so each file waits for the one before it.
 */
export const prepareAll = (deps: ImageDeps, items: UploadItem[]) =>
  items.reduce<Promise<PreparedItem[]>>(async (done, item) => {
    const list = await done;
    list.push({
      ...item,
      image: await prepareFile(deps, item.file),
      key: `${randomUUID()}${IMAGE_FORMAT.EXTENSION}`,
    });
    return list;
  }, Promise.resolve([]));

/**
 * Every put settles before anything is cleaned up: with `Promise.all` the
 * first failure cleaned up while other puts were still in flight, and those
 * landed after the delete.
 */
export const storeAll = async (deps: ImageDeps, prepared: PreparedItem[]) => {
  const puts = await Promise.allSettled(
    prepared.map(({ image, key }) => deps.putObject(key, image.buffer))
  );
  const failed = puts.find(
    (put): put is PromiseRejectedResult => put.status === "rejected"
  );
  if (failed) {
    throw failed.reason;
  }
};

/** Where the upload's handler reads whether its time budget has run out. */
export const UPLOAD_BUDGET = "uploadBudget";

/**
 * The upload's own time budget. Hono's `timeout` only races the handler, which
 * then stores and records the batch after the client has its 503, so a retry
 * stores it twice. This one also aborts a signal the handler checks before it
 * stores and before it records; its reason is the 503 naming this budget.
 */
export const uploadTimeout = createMiddleware<{
  Variables: { [UPLOAD_BUDGET]: AbortSignal };
}>(async (c, next) => {
  const budget = new AbortController();
  c.set(UPLOAD_BUDGET, budget.signal);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      budget.abort(
        new CodedError({
          code: IMAGE_ERROR_CODE.TIMEOUT,
          status: HTTP_STATUS.SERVICE_UNAVAILABLE,
          values: { seconds: UPLOAD_TIMEOUT_MS / MS_PER_SECOND },
        })
      );
      reject(budget.signal.reason);
    }, UPLOAD_TIMEOUT_MS);
  });
  try {
    await Promise.race([next(), expired]);
  } finally {
    clearTimeout(timer);
  }
});
