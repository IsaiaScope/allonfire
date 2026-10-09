// @module-tag unit
import { CodedError, invalidHook, validationError } from "../coded-error";

describe("CodedError", () => {
  it("carries what a host needs to render it", () => {
    const cause = new Error("sharp failed");
    const error = new CodedError(
      {
        code: "PAYLOAD_TOO_LARGE",
        errors: [{ message: "Too big", path: "file" }],
        status: 413,
        values: { limit: 100 },
      },
      { cause }
    );
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("CodedError");
    expect(error.message).toBe("PAYLOAD_TOO_LARGE");
    expect(error.status).toBe(413);
    expect(error.values).toEqual({ limit: 100 });
    expect(error.errors).toEqual([{ message: "Too big", path: "file" }]);
    expect(error.cause).toBe(cause);
  });

  it("defaults to no values and no field errors", () => {
    const error = new CodedError({ code: "NOT_FOUND", status: 404 });
    expect(error.values).toEqual({});
    expect(error.errors).toEqual([]);
  });
});

describe("validationError", () => {
  it("is a 400 naming each field, nested keys joined", () => {
    const error = validationError("VALIDATION_FAILED", [
      { message: "Required", path: ["meta", 0, { key: "alt" }] },
      { message: "Bad" },
    ]);
    expect(error.status).toBe(400);
    expect(error.code).toBe("VALIDATION_FAILED");
    expect(error.values).toEqual({ count: 2 });
    expect(error.errors).toEqual([
      { message: "Required", path: "meta.0.alt" },
      { message: "Bad", path: "" },
    ]);
  });

  it("is thrown by the hook only when the parse failed", () => {
    const hook = invalidHook("VALIDATION_FAILED");
    expect(() => hook({ success: true })).not.toThrow();
    expect(() => hook({ error: [], success: false })).toThrow(CodedError);
  });
});
