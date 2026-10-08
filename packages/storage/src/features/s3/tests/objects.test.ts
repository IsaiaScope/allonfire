// @module-tag unit
import { DeleteObjectsCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { deleteObjects, putObject } from "../objects";

const send = vi.hoisted(() =>
  vi.fn<(command: unknown) => Promise<unknown>>(() => Promise.resolve({}))
);
// The real client validates STORAGE_* at import; these tests need no provider.
vi.mock("../client", () => ({ s3: { send } }));

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
