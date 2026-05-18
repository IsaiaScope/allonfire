import { spawn } from "node:child_process";
import { Box, useApp } from "ink";
import type React from "react";
import { useEffect, useState } from "react";
import {
  checkTool,
  installCommand,
  type Tool,
  type ToolStatus,
} from "../../lib/deps";
import { detectPlatform, type Platform } from "../../lib/platform";
import { Header } from "../components/header";
import { InfoLines } from "../components/info-lines";
import type { BadgeState } from "../components/status-badge";
import { ToolStatusList } from "../components/tool-status-row";
import { nextRenderTick } from "./stage-view";

type RowState = {
  tool: Tool;
  state: BadgeState;
  details?: string[];
  statusLabel?: string;
};

type Props = {
  tools: Tool[];
  checkOnly: boolean;
  force: boolean;
};

type RowUpdater = (tool: Tool, patch: Partial<RowState>) => void;

function runInstaller(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (c: Buffer) => {
      stderr += c.toString();
    });
    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${cmd} exited ${code}: ${stderr.slice(-200)}`));
      }
    });
    proc.on("error", (err) => reject(err));
  });
}

function commandLabel(cmd: string, args: string[]): string {
  return [cmd, ...args].join(" ");
}

function installedDetails(
  label:
    | "already installed"
    | "found"
    | "present"
    | "installed"
    | "reinstalled",
  status: Extract<ToolStatus, { installed: true }>
): string[] {
  return [
    `status: ${label}`,
    `version: ${status.version}`,
    "source: PATH",
    `path: ${status.path}`,
  ];
}

function checkingPatch(): Partial<RowState> {
  return {
    state: "running",
    statusLabel: "Checking",
    details: ["checking PATH"],
  };
}

function installCheckOnlyPatch(
  tool: Tool,
  status: ToolStatus,
  force: boolean
): Partial<RowState> {
  return {
    state: status.installed ? "done" : "failed",
    statusLabel: installDoneLabel({
      checkOnly: true,
      force,
      installed: status.installed,
    }),
    details: status.installed
      ? installedDetails("present", status)
      : ["status: missing", `action: run pnpm video install ${tool}`],
  };
}

function alreadyInstalledPatch(
  status: Extract<ToolStatus, { installed: true }>
): Partial<RowState> {
  return {
    state: "done",
    statusLabel: "Present",
    details: installedDetails("already installed", status),
  };
}

function installingPatch(
  status: ToolStatus,
  cmd: string,
  args: string[]
): Partial<RowState> {
  return {
    state: "running",
    statusLabel: status.installed ? "Reinstalling" : "Installing",
    details: status.installed
      ? [
          ...installedDetails("found", status),
          `action: reinstalling via ${commandLabel(cmd, args)}`,
        ]
      : [
          "status: missing",
          `action: installing via ${commandLabel(cmd, args)}`,
        ],
  };
}

function installResultPatch(
  status: ToolStatus,
  force: boolean
): Partial<RowState> {
  if (!status.installed) {
    return {
      state: "failed",
      statusLabel: "Error",
      details: ["error: post-install check still failing"],
    };
  }

  return {
    state: "done",
    statusLabel: installDoneLabel({
      checkOnly: false,
      force,
      installed: true,
    }),
    details: installedDetails(force ? "reinstalled" : "installed", status),
  };
}

function errorPatch(err: unknown): Partial<RowState> {
  return {
    state: "failed",
    statusLabel: "Error",
    details: [`error: ${err instanceof Error ? err.message : String(err)}`],
  };
}

async function processInstallTool({
  checkOnly,
  force,
  platform,
  tool,
  update,
}: {
  checkOnly: boolean;
  force: boolean;
  platform: Platform;
  tool: Tool;
  update: RowUpdater;
}): Promise<void> {
  update(tool, checkingPatch());
  const status = await checkTool(tool);

  if (checkOnly) {
    update(tool, installCheckOnlyPatch(tool, status, force));
    return;
  }

  if (status.installed && !force) {
    update(tool, alreadyInstalledPatch(status));
    return;
  }

  const [cmd, args] = installCommand(platform, tool);
  update(tool, installingPatch(status, cmd, args));
  try {
    await runInstaller(cmd, args);
    update(tool, installResultPatch(await checkTool(tool), force));
  } catch (err) {
    update(tool, errorPatch(err));
  }
}

export function installDoneLabel({
  checkOnly,
  force,
  installed,
}: {
  checkOnly: boolean;
  force: boolean;
  installed: boolean;
}): string {
  if (checkOnly) {
    return installed ? "Present" : "Missing";
  }
  if (!installed) {
    return "Missing";
  }
  return force ? "Reinstalled" : "Installed";
}

export function installModeCopy({
  checkOnly,
  force,
}: {
  checkOnly: boolean;
  force: boolean;
}): { title: string; subtitle: string; lines: string[] } {
  if (checkOnly) {
    return {
      title: "dependency check",
      subtitle: "no installs will run",
      lines: [
        "Verifies the selected profile: download tools plus one local ASR engine.",
        force
          ? "--force is ignored in check mode; this command only reports status."
          : "Missing tools will be reported with the install command to run next.",
      ],
    };
  }

  if (force) {
    return {
      title: "force reinstall dependencies",
      subtitle: "runs installers even when tools are already present",
      lines: [
        "Checks each selected tool, then runs the installer for every tool.",
        "Use this when a binary is broken, outdated, or points to the wrong install.",
      ],
    };
  }

  return {
    title: "install dependencies",
    subtitle: "installs missing tools only",
    lines: [
      "Checks each selected tool before installing anything.",
      "The default profile installs yt-dlp, ffmpeg, and whisper.cpp.",
    ],
  };
}

export function installFooterLines(tools: Tool[]): string[] {
  return [
    `Checking tools: ${tools.join(", ")}.`,
    "This command handles command-line binaries only.",
    "Whisper model: downloaded later by `pnpm video transcribe`.",
  ];
}

export const InstallView: React.FC<Props> = ({ tools, checkOnly, force }) => {
  const { exit } = useApp();
  const copy = installModeCopy({ checkOnly, force });
  const footerLines = installFooterLines(tools);
  const [rows, setRows] = useState<RowState[]>(
    tools.map((tool) => ({ tool, state: "pending" }))
  );

  useEffect(() => {
    const platform = detectPlatform();
    let cancelled = false;

    const update = (tool: Tool, patch: Partial<RowState>) => {
      if (cancelled) {
        return;
      }
      setRows((prev) =>
        prev.map((r) => (r.tool === tool ? { ...r, ...patch } : r))
      );
    };

    (async () => {
      for (const tool of tools) {
        await processInstallTool({ checkOnly, force, platform, tool, update });
      }
      await nextRenderTick();
      exit();
    })();

    return () => {
      cancelled = true;
    };
  }, [tools, checkOnly, force, exit]);

  return (
    <Box flexDirection="column">
      <Header subtitle={copy.subtitle} title={copy.title} />
      <InfoLines lines={copy.lines} marginBottom={1} />
      <ToolStatusList
        rows={rows.map((row) => ({
          details: row.details,
          label: row.tool,
          state: row.state,
          statusLabel: row.statusLabel,
        }))}
      />
      <InfoLines lines={footerLines} marginTop={1} />
    </Box>
  );
};
