// @module-tag unit
import { HTTP } from "@allonfire/core/features/http/constants/http";
import {
  HeadBucketCommand,
  HeadObjectCommand,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { bucketExists, objectExists } from "../exists";

const send = vi.hoisted(() =>
  vi.fn<(command: unknown) => Promise<unknown>>(() => Promise.resolve({}))
);
// The real client validates STORAGE_* at import; these tests need no provider.
vi.mock("../client", () => ({ s3: { send } }));

const refusal = (httpStatusCode: number) =>
  new S3ServiceException({
    $fault: "client",
    $metadata: { httpStatusCode },
    name: "Refused",
  });

beforeEach(() => {
  send.mockClear();
});

describe("bucketExists", () => {
  it("is true when the provider answers the HEAD", async () => {
    expect(await bucketExists("files")).toBe(true);
    const command = send.mock.calls[0]?.[0];
    if (!(command instanceof HeadBucketCommand)) {
      throw new Error("expected a HeadBucketCommand");
    }
    expect(command.input).toEqual({ Bucket: "files" });
  });

  it("is false on a 404", async () => {
    send.mockRejectedValueOnce(refusal(HTTP.STATUS.NOT_FOUND));
    expect(await bucketExists("files")).toBe(false);
  });

  it("throws any other refusal: it does not say the bucket is absent", async () => {
    const forbidden = refusal(HTTP.STATUS.FORBIDDEN);
    send.mockRejectedValueOnce(forbidden);
    await expect(bucketExists("files")).rejects.toBe(forbidden);
  });
});

describe("objectExists", () => {
  it("is true when the provider answers the HEAD", async () => {
    expect(await objectExists("files", "a.pdf")).toBe(true);
    const command = send.mock.calls[0]?.[0];
    if (!(command instanceof HeadObjectCommand)) {
      throw new Error("expected a HeadObjectCommand");
    }
    expect(command.input).toEqual({ Bucket: "files", Key: "a.pdf" });
  });

  it("is false on a 404", async () => {
    send.mockRejectedValueOnce(refusal(HTTP.STATUS.NOT_FOUND));
    expect(await objectExists("files", "a.pdf")).toBe(false);
  });

  it("throws a failure that is not the provider's answer", async () => {
    const offline = new Error("connect ECONNREFUSED");
    send.mockRejectedValueOnce(offline);
    await expect(objectExists("files", "a.pdf")).rejects.toBe(offline);
  });
});
