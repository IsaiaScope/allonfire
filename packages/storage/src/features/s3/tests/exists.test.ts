// @module-tag unit
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { HeadBucketCommand, S3ServiceException } from "@aws-sdk/client-s3";
import { bucketExists } from "../exists";
import { send } from "./s3-client-mock";

vi.mock("../client", () => import("./s3-client-mock"));

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
