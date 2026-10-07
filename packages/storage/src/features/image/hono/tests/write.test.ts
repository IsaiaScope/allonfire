// @module-tag unit

import { sessionFor } from "@allonfire/auth/shared/tests/stub-auth";
import { type Json, stringifyJson } from "@allonfire/core/shared/utils/json";
import { AllowedApp, Role } from "@allonfire/database/enums";
import { ImageNotFoundError } from "@allonfire/database/features/image/image.service";
import { z } from "zod";
import { IMAGE_PATH } from "../../constants/paths";
import { imageBodySchema } from "../../constants/schemas";
import { MAX_INPUT_MEGAPIXELS } from "../../prepare/constants/limits";
import {
  ImageTooLargeError,
  UnsupportedImageError,
} from "../../prepare/prepare-image";
import {
  MAX_FILE_BYTES,
  MAX_UPLOAD_BYTES,
  UPLOAD_TIMEOUT_MS,
} from "../constants/limits";
import type { ImageDeps } from "../utils/deps";
import { imageRecord } from "./stub-image-deps";
import { errorOf, testHost } from "./test-host";

const admin = sessionFor({ role: Role.ADMIN });
const user = sessionFor({ role: Role.USER });
const ALT = { en: "The sea", it: "Il mare" };
const PREPARED = {
  blurDataUrl: "data:image/webp;base64,AAAA",
  buffer: Buffer.from("webp"),
  bytes: 4,
  height: 600,
  width: 800,
};
const imagesBody = z.array(imageBodySchema);
const IMAGE_KEY = /^[0-9a-f-]{36}\.avif$/;

const app = testHost;
const upload = (count: number, metaCount = count, size = 10) => {
  const form = new FormData();
  for (let index = 0; index < count; index += 1) {
    form.append("file", new File([new Uint8Array(size)], `${index}.jpg`));
  }
  form.append(
    "meta",
    stringifyJson(
      Array.from({ length: metaCount }, () => ({
        alt: ALT,
        app: AllowedApp.LAURA,
      }))
    )
  );
  return { body: form, method: "POST" };
};

const json = <T>(method: string, body: T & Json<T>) => ({
  body: stringifyJson(body),
  headers: { "content-type": "application/json" },
  method,
});

describe("POST /v1/images", () => {
  it("prepares, stores and records a batch of one", async () => {
    const putObject = vi.fn<ImageDeps["putObject"]>(async () => undefined);
    const createImages = vi.fn<ImageDeps["createImages"]>(async (rows) =>
      rows.map((row, index) => imageRecord({ ...row, id: `image-${index}` }))
    );
    const res = await app(admin, {
      createImages,
      prepare: async () => PREPARED,
      putObject,
    }).request(IMAGE_PATH, upload(1));

    expect(res.status).toBe(201);
    const [key] = putObject.mock.calls[0] ?? [];
    expect(key).toMatch(IMAGE_KEY);
    expect(createImages).toHaveBeenCalledWith([
      {
        alt: ALT,
        app: AllowedApp.LAURA,
        blurDataUrl: PREPARED.blurDataUrl,
        bytes: 4,
        height: 600,
        key,
        uploadedBy: admin.user.id,
        width: 800,
      },
    ]);
    expect(imagesBody.parse(await res.json())).toHaveLength(1);
  });

  it("refuses a USER", async () => {
    const res = await app(user, {}).request(IMAGE_PATH, upload(1));
    expect(res.status).toBe(403);
  });

  it("refuses meta that does not match the files", async () => {
    const res = await app(admin, {}).request(IMAGE_PATH, upload(2, 1));
    expect(res.status).toBe(400);
    expect((await errorOf(res)).code).toBe("VALIDATION_FAILED");
  });
});

describe("POST /v1/images refusals and failures", () => {
  it("refuses a body over the upload limit through the host's onError", async () => {
    const res = await app(admin, {}).request(IMAGE_PATH, {
      body: "x",
      headers: { "content-length": String(MAX_UPLOAD_BYTES + 1) },
      method: "POST",
    });
    expect(res.status).toBe(413);
    const body = await errorOf(res);
    expect(body.code).toBe("PAYLOAD_TOO_LARGE");
    expect(body.values).toEqual({ limit: MAX_UPLOAD_BYTES });
  });

  it("refuses a file over the per-file limit, naming that limit", async () => {
    const res = await app(admin, {}).request(
      IMAGE_PATH,
      upload(1, 1, MAX_FILE_BYTES + 1)
    );
    expect(res.status).toBe(413);
    const body = await errorOf(res);
    expect(body.code).toBe("PAYLOAD_TOO_LARGE");
    expect(body.values).toEqual({ limit: MAX_FILE_BYTES });
  });

  it("rejects the whole batch when one file is not an image", async () => {
    let calls = 0;
    const res = await app(admin, {
      prepare: () => {
        calls += 1;
        return calls === 2
          ? Promise.reject(new UnsupportedImageError())
          : Promise.resolve(PREPARED);
      },
    }).request(IMAGE_PATH, upload(2));
    expect(res.status).toBe(415);
    expect((await errorOf(res)).code).toBe("UNSUPPORTED_IMAGE");
  });

  it("refuses an image over the pixel limit with its own 413", async () => {
    const res = await app(admin, {
      prepare: () => Promise.reject(new ImageTooLargeError()),
    }).request(IMAGE_PATH, upload(1));
    expect(res.status).toBe(413);
    const body = await errorOf(res);
    expect(body.code).toBe("IMAGE_TOO_LARGE");
    expect(body.values).toEqual({ limit: MAX_INPUT_MEGAPIXELS });
  });

  it("names its own time budget when the upload runs out of time", async () => {
    vi.useFakeTimers();
    try {
      const pending = app(admin, {
        prepare: () => new Promise(() => undefined),
      }).request(IMAGE_PATH, upload(1));
      await vi.advanceTimersByTimeAsync(UPLOAD_TIMEOUT_MS);
      const res = await pending;
      expect(res.status).toBe(503);
      const body = await errorOf(res);
      expect(body.code).toBe("TIMEOUT");
      expect(body.values).toEqual({ seconds: UPLOAD_TIMEOUT_MS / 1000 });
    } finally {
      vi.useRealTimers();
    }
  });

  it("stores and records nothing once the upload has run out of time", async () => {
    let release: () => void = () => undefined;
    const putObject = vi.fn<ImageDeps["putObject"]>(async () => undefined);
    const createImages = vi.fn<ImageDeps["createImages"]>(async () => []);
    vi.useFakeTimers();
    try {
      const pending = app(admin, {
        createImages,
        prepare: () =>
          new Promise((resolve) => {
            release = () => resolve(PREPARED);
          }),
        putObject,
      }).request(IMAGE_PATH, upload(1));
      await vi.advanceTimersByTimeAsync(UPLOAD_TIMEOUT_MS);
      expect((await pending).status).toBe(503);
    } finally {
      vi.useRealTimers();
    }
    // The handler finishes preparing after the client already has its 503.
    release();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(putObject).not.toHaveBeenCalled();
    expect(createImages).not.toHaveBeenCalled();
  });

  it("cleans up only after every put has settled", async () => {
    const order: string[] = [];
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let puts = 0;
    const pending = app(admin, {
      deleteObjects: () => {
        order.push("cleanup");
        return Promise.resolve();
      },
      prepare: async () => PREPARED,
      putObject: async () => {
        puts += 1;
        if (puts === 1) {
          throw new Error("storage down");
        }
        await gate;
        order.push("late put");
      },
    }).request(IMAGE_PATH, upload(2));
    await vi.waitFor(() => expect(puts).toBe(2));
    // With Promise.all the cleanup has already run here, before the slow put.
    release();
    expect((await pending).status).toBe(500);
    expect(order).toEqual(["late put", "cleanup"]);
  });

  it("deletes the stored objects when the rows cannot be written", async () => {
    const deleteObjects = vi.fn<ImageDeps["deleteObjects"]>(
      async () => undefined
    );
    const putObject = vi.fn<ImageDeps["putObject"]>(async () => undefined);
    const res = await app(admin, {
      createImages: () => Promise.reject(new Error("db down")),
      deleteObjects,
      prepare: async () => PREPARED,
      putObject,
    }).request(IMAGE_PATH, upload(2));
    expect(res.status).toBe(500);
    const putKeys = putObject.mock.calls.map(([key]) => key);
    expect(deleteObjects).toHaveBeenCalledWith(putKeys);
  });
});

describe("PATCH /v1/images", () => {
  it("updates a batch", async () => {
    const res = await app(admin, {
      updateImages: async (changes) =>
        changes.map(({ id }) => imageRecord({ app: AllowedApp.ALL, id })),
    }).request(
      IMAGE_PATH,
      json("PATCH", [{ app: AllowedApp.ALL, id: "image-1" }])
    );
    expect(res.status).toBe(200);
    expect(imagesBody.parse(await res.json())[0]?.app).toBe(AllowedApp.ALL);
  });

  it("answers 404 when an id is unknown", async () => {
    const res = await app(admin, {
      updateImages: () => Promise.reject(new ImageNotFoundError(["missing"])),
    }).request(IMAGE_PATH, json("PATCH", [{ id: "missing" }]));
    expect(res.status).toBe(404);
  });

  it("refuses alt missing a language", async () => {
    const res = await app(admin, {}).request(
      IMAGE_PATH,
      json("PATCH", [{ alt: { en: "only English" }, id: "image-1" }])
    );
    expect(res.status).toBe(400);
  });
});

describe("DELETE /v1/images", () => {
  it("deletes the rows, then the objects", async () => {
    const order: string[] = [];
    const res = await app(admin, {
      deleteImages: () => {
        order.push("rows");
        return Promise.resolve(["a.webp"]);
      },
      deleteObjects: (keys) => {
        order.push(`objects:${keys.join()}`);
        return Promise.resolve();
      },
    }).request(IMAGE_PATH, json("DELETE", { ids: ["image-1"] }));
    expect(res.status).toBe(204);
    expect(order).toEqual(["rows", "objects:a.webp"]);
  });

  it("still answers 204 when storage fails after the rows are gone", async () => {
    const res = await app(admin, {
      deleteImages: async () => ["a.webp"],
      deleteObjects: () => Promise.reject(new Error("storage down")),
    }).request(IMAGE_PATH, json("DELETE", { ids: ["image-1"] }));
    expect(res.status).toBe(204);
  });

  it("answers 404 when an id is unknown", async () => {
    const res = await app(admin, {
      deleteImages: () => Promise.reject(new ImageNotFoundError(["missing"])),
    }).request(IMAGE_PATH, json("DELETE", { ids: ["missing"] }));
    expect(res.status).toBe(404);
  });
});
