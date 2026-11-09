import { spawn, spawnSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import { stripVTControlCharacters } from "node:util";
import { REPO } from "../local/repo";
import { STAGE, type StageName, type Tool } from "./stages";
import {
  stageSummary,
  type ToolResult,
  testCount,
  turboCache,
} from "./summary";

const ERROR_LINE = /error|fail|✖|×|✘/i;
/** How many lines a failure shows. */
const FIRST_LINES = 20;
const TURBO_RUNS = join(REPO.ROOT, ".turbo", "runs");

type Options = {
  affected: boolean;
  keepGoing: boolean;
  /** Where the Markdown goes: CI's `$GITHUB_STEP_SUMMARY`. */
  summaryPath?: string;
  /** The run's page, linked under a failure. */
  runUrl?: string;
  /** The tools to run; the Stage's own by default. */
  tools?: readonly Tool[];
  /** Where progress and the tools' output go; stdout by default. */
  log?: (text: string) => void;
};

const installed = (binary: string) =>
  spawnSync("sh", ["-c", `command -v ${binary}`], { stdio: "ignore" })
    .status === 0;

const firstLines = (output: string) => {
  const lines = output.split("\n").filter((line) => line.trim() !== "");
  if (lines.length === 0) {
    return ["(no output)"];
  }
  const errors = lines.filter((line) => ERROR_LINE.test(line));
  return (errors.length > 0 ? errors : lines.slice(-FIRST_LINES)).slice(
    0,
    FIRST_LINES
  );
};

/** The newest Turbo run summary written since `since`, as text. */
const newestTurboRun = (since: number) => {
  if (!existsSync(TURBO_RUNS)) {
    return;
  }
  const [newest] = readdirSync(TURBO_RUNS)
    .filter((file) => file.endsWith(".json") && !file.startsWith("._"))
    .map((file) => join(TURBO_RUNS, file))
    .filter((path) => statSync(path).mtimeMs >= since)
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  return newest ? readFileSync(newest, "utf8") : undefined;
};

const runTool = (tool: Tool, affected: boolean, log: (text: string) => void) =>
  new Promise<ToolResult>((resolve) => {
    const started = Date.now();
    if (tool.requires && !installed(tool.requires)) {
      resolve({
        firstLines: [],
        ms: 0,
        name: tool.name,
        output: "",
        reason: "not installed",
        status: "skipped",
      });
      return;
    }
    const command =
      affected && tool.turbo
        ? `${tool.command} --affected --summarize`
        : tool.command;
    const child = spawn("sh", ["-c", command], {
      cwd: REPO.ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    const keep = (chunk: Buffer) => {
      const text = chunk.toString();
      output += text;
      log(text);
    };
    child.stdout.on("data", keep);
    child.stderr.on("data", keep);
    child.on("close", (code) => {
      const plain = stripVTControlCharacters(output);
      const summary =
        affected && tool.turbo ? newestTurboRun(started) : undefined;
      const tests = testCount(plain);
      resolve({
        firstLines: code === 0 ? [] : firstLines(plain),
        ms: Date.now() - started,
        name: tool.name,
        output: plain,
        status: code === 0 ? "passed" : "failed",
        ...(tests === undefined ? {} : { tests }),
        ...(summary ? { turbo: turboCache(summary) } : {}),
      });
    });
  });

const MARK = { failed: "✖", passed: "✔", skipped: "○" } as const;

/** Runs a Stage's tools in order: stops at the first failure unless `keepGoing`, then reports every tool it ran. */
export async function runStage(stage: StageName, options: Options) {
  const log = options.log ?? ((text: string) => process.stdout.write(text));
  const inOrder = async (
    tools: readonly Tool[],
    done: readonly ToolResult[]
  ): Promise<readonly ToolResult[]> => {
    const [tool, ...rest] = tools;
    if (!tool) {
      return done;
    }
    log(`\n▶ ${stage} · ${tool.name}\n`);
    const result = await runTool(tool, options.affected, log);
    log(
      `${MARK[result.status]} ${tool.name} ${(result.ms / 1000).toFixed(1)}s${result.reason ? ` (${result.reason})` : ""}\n`
    );
    const results = [...done, result];
    return result.status === "failed" && !options.keepGoing
      ? results
      : inOrder(rest, results);
  };
  const results = await inOrder(options.tools ?? STAGE[stage], []);
  if (options.summaryPath) {
    appendFileSync(
      options.summaryPath,
      stageSummary(
        stage,
        results,
        options.runUrl ? { url: options.runUrl } : undefined
      )
    );
  }
  return results;
}
