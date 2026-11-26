// @module-tag integration

/** Past Vitest's own one second: a page a busy CI runner draws late. */
const LATE_MS = 1500;

/** A page that is ready `LATE_MS` from now. */
const latePage = () => {
  const readyAt = Date.now() + LATE_MS;
  return () => Date.now() >= readyAt;
};

describe("the browser tests' shared wait", () => {
  it("has vi.waitFor wait for a page that is late", async () => {
    const ready = latePage();
    await vi.waitFor(() => {
      if (!ready()) {
        throw new Error("Not drawn yet.");
      }
    });
    expect(ready()).toBe(true);
  });

  it("has expect.poll wait for a page that is late", async () => {
    await expect.poll(latePage()).toBe(true);
  });

  it("keeps the limit a wait sets itself", async () => {
    await expect(
      vi.waitFor(
        () => {
          throw new Error("Never drawn.");
        },
        { timeout: 50 }
      )
    ).rejects.toThrow("Never drawn.");
  });
});
