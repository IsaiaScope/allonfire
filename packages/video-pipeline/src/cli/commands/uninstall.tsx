import { spawn } from "node:child_process";
import { Box, useApp } from "ink";
import type React from "react";
import { useEffect, useState } from "react";
import {
  checkTool,
  type Tool,
  type ToolStatus,
  uninstallCommand,
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

function runUninstaller(cmd: string, args: string[]): Promise<void> {
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

function foundDetails(
  status: Extract<ToolStatus, { installed: true }>
): string[] {
  return [
    "status: installed",
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

function uninstallCheckOnlyPatch(status: ToolStatus): Partial<RowState> {
  return {
    state: "done",
    statusLabel: uninstallDoneLabel({
      checkOnly: true,
      installed: status.installed,
    }),
    details: status.installed
      ? [...foundDetails(status), "action: would uninstall"]
      : ["status: not installed", "action: nothing to remove"],
  };
}

function uninstallSkippedPatch(): Partial<RowState> {
  return {
    state: "done",
    statusLabel: uninstallDoneLabel({
      checkOnly: false,
      installed: false,
    }),
    details: ["status: not installed", "action: skipped"],
  };
}

function removingPatch(
  status: ToolStatus,
  cmd: string,
  args: string[]
): Partial<RowState> {
  return {
    state: "running",
    statusLabel: "Removing",
    details: status.installed
      ? [
          ...foundDetails(status),
          `action: uninstalling via ${commandLabel(cmd, args)}`,
        ]
      : [
          "status: not detected",
          `action: forcing uninstall via ${commandLabel(cmd, args)}`,
        ],
  };
}

function uninstallResultPatch(status: ToolStatus): Partial<RowState> {
  if (status.installed) {
    return {
      state: "failed",
      statusLabel: "Error",
      details: [
        "error: uninstall completed but binary is still detected",
        `path: ${status.path}`,
      ],
    };
  }

  return {
    state: "done",
    statusLabel: uninstallDoneLabel({ checkOnly: false, installed: true }),
    details: ["status: removed"],
  };
}

function errorPatch(err: unknown): Partial<RowState> {
  return {
    state: "failed",
    statusLabel: "Error",
    details: [`error: ${err instanceof Error ? err.message : String(err)}`],
  };
}

async function processUninstallTool({
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
    update(tool, uninstallCheckOnlyPatch(status));
    return;
  }

  if (!(status.installed || force)) {
    update(tool, uninstallSkippedPatch());
    return;
  }

  const [cmd, args] = uninstallCommand(platform, tool);
  update(tool, removingPatch(status, cmd, args));
  try {
    await runUninstaller(cmd, args);
    update(tool, uninstallResultPatch(await checkTool(tool)));
  } catch (err) {
    update(tool, errorPatch(err));
  }
}

export function uninstallDoneLabel({
  checkOnly,
  installed,
}: {
  checkOnly: boolean;
  installed: boolean;
}): string {
  if (checkOnly) {
    return installed ? "Removable" : "Absent";
  }
  return installed ? "Removed" : "Skipped";
}

export function uninstallModeCopy({
  checkOnly,
  force,
}: {
  checkOnly: boolean;
  force: boolean;
}): { title: string; subtitle: string; lines: string[] } {
  if (checkOnly) {
    return {
      title: "uninstall check",
      subtitle: "no packages will be removed",
      lines: [
        "Checks which selected command-line tools are currently on PATH.",
        "Installed tools are reported as removable; missing tools are left alone.",
      ],
    };
  }

  if (force) {
    return {
      title: "force uninstall dependencies",
      subtitle: "runs uninstallers even when tools are not detected",
      lines: [
        "Runs the platform uninstaller for every selected tool.",
        "Use this to clean stale package-manager records or broken binaries.",
      ],
    };
  }

  return {
    title: "uninstall dependencies",
    subtitle: "removes installed selected tools",
    lines: [
      "Checks each selected tool before removing anything.",
      "Missing tools are skipped; installed tools are removed with this OS package manager.",
    ],
  };
}

export function uninstallFooterLines(tools: Tool[]): string[] {
  return [
    `Target tools: ${tools.join(", ")}.`,
    "This removes command-line binaries only.",
    "Project files and downloaded video work are not touched.",
  ];
}

export const UninstallView: React.FC<Props> = ({ tools, checkOnly, force }) => {
  const { exit } = useApp();
  const copy = uninstallModeCopy({ checkOnly, force });
  const footerLines = uninstallFooterLines(tools);
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
        await processUninstallTool({
          checkOnly,
          force,
          platform,
          tool,
          update,
        });
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
