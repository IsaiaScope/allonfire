#!/usr/bin/env tsx
import { Command, InvalidArgumentError } from "commander";
import { render } from "ink";
import type React from "react";
import { env } from "../env";
import { VIDEO_AGENTS, type VideoAgentChoice } from "../lib/agent";
import { defaultToolsForPlatform, KNOWN_TOOLS, type Tool } from "../lib/deps";
import { detectPlatform, type Platform } from "../lib/platform";
import { resolveProjectFolder } from "../lib/resolve";
import { extractYoutubeId } from "../pipeline/download";
import { DownloadView } from "./commands/download";
import { InstallView } from "./commands/install";
import { ListView } from "./commands/list";
import { OverlayView } from "./commands/overlay";
import { TranscribeView } from "./commands/transcribe";
import { TranslateView } from "./commands/translate";
import { UninstallView } from "./commands/uninstall";

const QUALITIES = ["4k", "1080p", "720p"] as const;
const STATUSES = ["pending", "failed", "done"] as const;
const WWW_PREFIX_RE = /^www\./;

function parseEnum<T extends string>(allowed: readonly T[]) {
  return (value: string): T => {
    if (!(allowed as readonly string[]).includes(value)) {
      throw new InvalidArgumentError(`Expected one of: ${allowed.join(", ")}`);
    }
    return value as T;
  };
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function parseYoutubeUrl(value: string): string {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.replace(WWW_PREFIX_RE, "");
    if (host !== "youtube.com" && host !== "youtu.be") {
      throw new Error("not youtube");
    }
    extractYoutubeId(value);
    return value;
  } catch {
    throw new InvalidArgumentError(
      "Expected a valid YouTube video URL, for example: https://www.youtube.com/watch?v=7zxIeRWasbc"
    );
  }
}

export function selectTools(
  tools: string[],
  platform: Platform = detectPlatform()
): Tool[] {
  const selected = tools.length > 0 ? tools : defaultToolsForPlatform(platform);
  return selected.map((t) => {
    if (!(KNOWN_TOOLS as readonly string[]).includes(t)) {
      throw new InvalidArgumentError(
        `Unknown tool '${t}'. Allowed: ${KNOWN_TOOLS.join(", ")}`
      );
    }
    return t as Tool;
  });
}

async function mount(element: React.ReactElement): Promise<void> {
  const { waitUntilExit } = render(element);
  await waitUntilExit();
}

export function buildCli(): Command {
  const program = new Command();
  program
    .name("video")
    .description("AllOnFire video pipeline CLI")
    .version("1.0.0");

  program
    .command("install [tools...]")
    .option("--check", "report only, do not install", false)
    .option("--force", "reinstall even if present", false)
    .action(
      async (tools: string[], opts: { check: boolean; force: boolean }) => {
        const selected = selectTools(tools);
        await mount(
          <InstallView
            checkOnly={opts.check}
            force={opts.force}
            tools={selected}
          />
        );
      }
    );

  program
    .command("uninstall [tools...]")
    .option("--check", "report only, do not uninstall", false)
    .option("--force", "run uninstallers even if not detected", false)
    .action(
      async (tools: string[], opts: { check: boolean; force: boolean }) => {
        const selected = selectTools(tools);
        await mount(
          <UninstallView
            checkOnly={opts.check}
            force={opts.force}
            tools={selected}
          />
        );
      }
    );

  program
    .command("download")
    .argument("<url>", "YouTube video URL", parseYoutubeUrl)
    .option("--title <title>", "Project title override")
    .option("--date <yyyy-mm-dd>", "Date prefix for folder", todayDate())
    .option(
      "--quality <q>",
      `Video quality cap (${QUALITIES.join("|")})`,
      parseEnum(QUALITIES),
      "1080p" as (typeof QUALITIES)[number]
    )
    .option("--force", "Redo even if marked done", false)
    .action(
      async (
        url: string,
        opts: {
          title?: string;
          date: string;
          quality: (typeof QUALITIES)[number];
          force: boolean;
        }
      ) => {
        await mount(
          <DownloadView
            date={opts.date}
            force={opts.force}
            quality={opts.quality}
            title={opts.title}
            url={url}
          />
        );
      }
    );

  for (const [name, View] of [
    ["transcribe", TranscribeView],
    ["translate", TranslateView],
  ] as const) {
    program
      .command(`${name} [project]`)
      .option("--force", "redo even if marked done", false)
      .option(
        "--agent <agent>",
        `agent runner (${VIDEO_AGENTS.join("|")})`,
        parseEnum(VIDEO_AGENTS)
      )
      .action(
        async (
          project: string | undefined,
          opts: { force: boolean; agent?: VideoAgentChoice }
        ) => {
          const folder = resolveProjectFolder(
            project ?? "",
            env.VIDEO_WORK_DIR
          );
          await mount(
            <View agent={opts.agent} folder={folder} force={opts.force} />
          );
        }
      );
  }

  program
    .command("overlay [project]")
    .option("--force", "redo even if marked done", false)
    .option(
      "--agent <agent>",
      `agent runner (${VIDEO_AGENTS.join("|")})`,
      parseEnum(VIDEO_AGENTS)
    )
    .option("--count <n>", "explicit overlay count", (v) =>
      Number.parseInt(v, 10)
    )
    .action(
      async (
        project: string | undefined,
        opts: { agent?: VideoAgentChoice; force: boolean; count?: number }
      ) => {
        const folder = resolveProjectFolder(project ?? "", env.VIDEO_WORK_DIR);
        await mount(
          <OverlayView
            agent={opts.agent}
            count={opts.count}
            folder={folder}
            force={opts.force}
          />
        );
      }
    );

  program
    .command("list")
    .option("--status <s>", `(${STATUSES.join("|")})`, parseEnum(STATUSES))
    .action(async (opts: { status?: (typeof STATUSES)[number] }) => {
      await mount(<ListView statusFilter={opts.status} />);
    });

  return program;
}

const invokedDirectly =
  import.meta.url === `file://${process.argv[1]}` ||
  (process.argv[1] !== undefined && import.meta.url.endsWith(process.argv[1]));

if (invokedDirectly) {
  buildCli()
    .parseAsync(process.argv)
    .catch((err) => {
      process.stderr.write(
        `${err instanceof Error ? err.message : String(err)}\n`
      );
      process.exit(1);
    });
}
