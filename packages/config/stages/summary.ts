import type { StageName } from "./stages";

/** What one tool did. */
export type ToolResult = {
  name: string;
  status: "passed" | "failed" | "skipped";
  ms: number;
  reason?: string;
  /** The lines to read first on a failure. */
  firstLines: readonly string[];
  /** Everything it printed, colours stripped. */
  output: string;
  tests?: number;
  turbo?: { cached: number; ran: number };
};

const ICON = { failed: "✖", passed: "✔", skipped: "○" } as const;
const VITEST_PASSED = /Tests\s+(\d+) passed/g;
const PLAYWRIGHT_PASSED = /^\s+(\d+) passed \(/gm;
const TURBO_CACHE = /"status"\s*:\s*"(HIT|MISS)"/g;

const sum = (text: string, pattern: RegExp) =>
  [...text.matchAll(pattern)].reduce(
    (total, [, n = "0"]) => total + Number(n),
    0
  );

/** Vitest's and Playwright's passed tests in an output, or undefined when it ran none. */
export const testCount = (output: string) => {
  const total = sum(output, VITEST_PASSED) + sum(output, PLAYWRIGHT_PASSED);
  return total > 0 ? total : undefined;
};

// ponytail: config cannot import core's parseJson (core depends on config), so
// Turbo's run summary is read as text, as config's other guards read JSON.
/** Turbo's cache hits and misses in a `--summarize` file. */
export const turboCache = (summary: string) => {
  const states = [...summary.matchAll(TURBO_CACHE)].map(([, state]) => state);
  return {
    cached: states.filter((state) => state === "HIT").length,
    ran: states.filter((state) => state === "MISS").length,
  };
};

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

/** A Stage's results as GitHub's job summary shows them: a row per tool, then each failure's first lines. */
export const stageSummary = (
  stage: StageName,
  results: readonly ToolResult[],
  run?: { url: string }
) => {
  const total = results.reduce((ms, result) => ms + result.ms, 0);
  const rows = results.map(
    ({ ms, name, reason, status, tests, turbo }) =>
      `| ${name} | ${ICON[status]} ${status}${reason ? ` (${reason})` : ""} | ${seconds(ms)} | ${tests ?? ""} | ${turbo ? `${turbo.cached} cached / ${turbo.ran} ran` : ""} |`
  );
  const failures = results
    .filter(({ status }) => status === "failed")
    .map(
      ({ firstLines, name }) =>
        `**${name} failed**\n\n\`\`\`\n${firstLines.join("\n")}\n\`\`\`${run ? `\n\nFull log: ${run.url}` : ""}`
    );
  return [
    `### ${stage} · ${seconds(total)}`,
    "",
    "| tool | result | time | tests | Turbo |",
    "|---|---|---|---|---|",
    ...rows,
    "",
    ...failures,
    "",
  ].join("\n");
};
