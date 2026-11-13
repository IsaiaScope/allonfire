// @module-tag unit
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import {
  deleteObjects,
  listBucketTotals,
  listObjectSizes,
  putObject,
} from "../utils/objects";
import { send } from "./s3-client-mock";

vi.mock("../utils/client", () => import("./s3-client-mock"));

const sent = (index = 0): unknown => send.mock.calls[index]?.[0];

beforeEach(() => {
  send.mockClear();
});

describe("putObject", () => {
  it("puts the body in the named bucket with its headers", async () => {
    const body = Buffer.from("x");
    await putObject("files", "a.pdf", body, {
      cacheControl: "no-cache",
      contentType: "application/pdf",
    });
    const command = sent();
    if (!(command instanceof PutObjectCommand)) {
      throw new Error("expected a PutObjectCommand");
    }
    expect(command.input).toEqual({
      Body: body,
      Bucket: "files",
      CacheControl: "no-cache",
      ContentType: "application/pdf",
      Key: "a.pdf",
    });
  });
});

describe("deleteObjects", () => {
  it("deletes every key in one request", async () => {
    await deleteObjects("files", ["a", "b"]);
    const command = sent();
    if (!(command instanceof DeleteObjectsCommand)) {
      throw new Error("expected a DeleteObjectsCommand");
    }
    expect(command.input).toEqual({
      Bucket: "files",
      Delete: { Objects: [{ Key: "a" }, { Key: "b" }] },
    });
  });

  it("throws when the provider refuses any key, though it answers 200", async () => {
    send.mockResolvedValueOnce({
      Errors: [{ Code: "AccessDenied", Key: "b", Message: "Access Denied" }],
    });
    await expect(deleteObjects("files", ["a", "b"])).rejects.toThrow(
      "b: AccessDenied"
    );
  });

  it("sends nothing for no keys", async () => {
    await deleteObjects("files", []);
    expect(send).not.toHaveBeenCalled();
  });
});

describe("listBucketTotals", () => {
  it("sums Size and counts Contents over one page", async () => {
    send.mockResolvedValueOnce({ Contents: [{ Size: 10 }, { Size: 5 }] });
    await expect(listBucketTotals("files")).resolves.toEqual({
      bytes: 15,
      objects: 2,
    });
    const command = sent();
    if (!(command instanceof ListObjectsV2Command)) {
      throw new Error("expected a ListObjectsV2Command");
    }
    expect(command.input).toEqual({
      Bucket: "files",
      ContinuationToken: undefined,
    });
  });

  it("follows NextContinuationToken until the listing is complete", async () => {
    send
      .mockResolvedValueOnce({
        Contents: [{ Size: 1 }],
        IsTruncated: true,
        NextContinuationToken: "t1",
      })
      .mockResolvedValueOnce({ Contents: [{ Size: 2 }, { Size: 3 }] });
    await expect(listBucketTotals("files")).resolves.toEqual({
      bytes: 6,
      objects: 3,
    });
    const second = sent(1);
    if (!(second instanceof ListObjectsV2Command)) {
      throw new Error("expected a ListObjectsV2Command");
    }
    expect(second.input.ContinuationToken).toBe("t1");
  });

  it("answers zeros for an empty bucket", async () => {
    send.mockResolvedValueOnce({});
    await expect(listBucketTotals("files")).resolves.toEqual({
      bytes: 0,
      objects: 0,
    });
  });

  it("lets a refused listing throw", async () => {
    send.mockRejectedValueOnce(new Error("AccessDenied"));
    await expect(listBucketTotals("files")).rejects.toThrow("AccessDenied");
  });
});

describe("listObjectSizes", () => {
  it("lists each key under the prefix with its size, following the continuation token", async () => {
    send
      .mockResolvedValueOnce({
        Contents: [{ Key: "avatar-a", Size: 4 }],
        IsTruncated: true,
        NextContinuationToken: "t1",
      })
      .mockResolvedValueOnce({ Contents: [{ Key: "avatar-b", Size: 6 }] });
    await expect(listObjectSizes("files", "avatar-")).resolves.toEqual([
      { bytes: 4, key: "avatar-a" },
      { bytes: 6, key: "avatar-b" },
    ]);
    const first = sent();
    if (!(first instanceof ListObjectsV2Command)) {
      throw new Error("expected a ListObjectsV2Command");
    }
    expect(first.input).toEqual({
      Bucket: "files",
      ContinuationToken: undefined,
      Prefix: "avatar-",
    });
  });

  it("answers an empty list for no object, and lets a refused listing throw", async () => {
    send.mockResolvedValueOnce({});
    await expect(listObjectSizes("files", "avatar-")).resolves.toEqual([]);
    send.mockRejectedValueOnce(new Error("AccessDenied"));
    await expect(listObjectSizes("files", "avatar-")).rejects.toThrow(
      "AccessDenied"
    );
  });
});
