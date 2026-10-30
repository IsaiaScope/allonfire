import { afterEach, beforeEach, vi } from "vitest";

const KINDS = ["unit", "integration"];

// Every test says what it needs: `// @module-tag unit` or
// `// @module-tag integration` on the file's first line. Browser tests
// (`*.browser.test.tsx`) are `integration`; e2e tests are Playwright's (`e2e/`).
beforeEach(({ task }) => {
  if (!task.tags?.some((tag) => KINDS.includes(tag))) {
    throw new Error(
      `${task.file.name} has no kind: start it with // @module-tag unit or // @module-tag integration`
    );
  }
});

// The preset undoes mocks, env and globals itself; fake timers have no such
// option, and one left on by a failed test would freeze the next.
afterEach(() => {
  vi.useRealTimers();
});
