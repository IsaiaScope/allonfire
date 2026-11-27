import { server } from "vitest/browser";

// `vi.waitFor` has no setting for its limit, so every browser test gets
// `expect.poll`'s, which the preset sets; a wait that names its own keeps it.
const {
  config: { expect: shared },
} = server;
const { waitFor } = vi;
vi.waitFor = (callback, options = {}) =>
  waitFor(
    callback,
    typeof options === "number" ? options : { ...shared.poll, ...options }
  );
