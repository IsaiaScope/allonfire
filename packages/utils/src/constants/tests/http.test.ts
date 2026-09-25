// @module-tag unit
import { HTTP_STATUS, httpHeaderSchema, httpStatusSchema } from "../http";

describe("http schemas", () => {
  it("accept only listed statuses, numbers included", () => {
    expect(httpStatusSchema.safeParse(HTTP_STATUS.NOT_FOUND).success).toBe(
      true
    );
    expect(httpStatusSchema.safeParse(999).success).toBe(false);
    expect(httpStatusSchema.safeParse("404").success).toBe(false);
  });

  it("accept only listed header names", () => {
    expect(httpHeaderSchema.safeParse("retry-after").success).toBe(true);
    expect(httpHeaderSchema.safeParse("x-made-up").success).toBe(false);
  });
});
