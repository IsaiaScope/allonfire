// @module-tag unit
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runStage } from "../run";
import type { Tool } from "../stages";

const tool = (
  name: string,
  command: string,
  extra: Partial<Tool> = {}
): Tool => ({
  command,
  name,
  why: `${name} for the test`,
  ...extra,
});
const quiet = { log: () => undefined };

describe("runStage", () => {
  it("runs the tools in order and stops at the first failure", async () => {
    const results = await runStage("static", {
      ...quiet,
      affected: false,
      keepGoing: false,
      tools: [tool("a", "echo a"), tool("b", "exit 1"), tool("c", "echo c")],
    });
    expect(results.map(({ name, status }) => [name, status])).toEqual([
      ["a", "passed"],
      ["b", "failed"],
    ]);
  });

  it("runs every tool with keepGoing, and reports each", async () => {
    const results = await runStage("static", {
      ...quiet,
      affected: false,
      keepGoing: true,
      tools: [tool("a", "exit 1"), tool("b", "echo b")],
    });
    expect(results.map(({ status }) => status)).toEqual(["failed", "passed"]);
  });

  it("points at a failure that printed nothing", async () => {
    const [result] = await runStage("static", {
      ...quiet,
      affected: false,
      keepGoing: false,
      tools: [tool("silent", "exit 3")],
    });
    expect(result).toMatchObject({
      firstLines: ["(no output)"],
      status: "failed",
    });
  });

  it("skips a tool whose binary is not installed", async () => {
    const [result] = await runStage("static", {
      ...quiet,
      affected: false,
      keepGoing: false,
      tools: [tool("x", "echo never", { requires: "no-such-binary-anywhere" })],
    });
    expect(result).toMatchObject({
      reason: "not installed",
      status: "skipped",
    });
  });

  it("gives --affected and --summarize to Turbo tools only", async () => {
    const results = await runStage("static", {
      ...quiet,
      affected: true,
      keepGoing: true,
      tools: [tool("t", "echo", { turbo: true }), tool("p", "echo")],
    });
    expect(results.map(({ output }) => output.trim())).toEqual([
      "--affected --summarize",
      "",
    ]);
  });

  it("writes a summary only where one is asked for", async () => {
    const dir = mkdtempSync(join(tmpdir(), "stages-"));
    const path = join(dir, "summary.md");
    await runStage("static", {
      ...quiet,
      affected: false,
      keepGoing: false,
      tools: [tool("a", "echo a")],
    });
    expect(existsSync(path)).toBe(false);
    await runStage("static", {
      ...quiet,
      affected: false,
      keepGoing: false,
      summaryPath: path,
      tools: [tool("a", "echo a")],
    });
    expect(readFileSync(path, "utf8")).toContain("| a |");
  });
});
