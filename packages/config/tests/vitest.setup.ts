import { beforeEach } from "vitest";

const KINDS = ["unit", "integration"];

// Every test says what it needs: `// @module-tag unit` or
// `// @module-tag integration` on the file's first line. Browser tests are
// Playwright's (`e2e/`), not vitest's.
beforeEach(({ task }) => {
  if (!task.tags?.some((tag) => KINDS.includes(tag))) {
    throw new Error(
      `${task.file.name} has no kind: start it with // @module-tag unit or // @module-tag integration`
    );
  }
});
