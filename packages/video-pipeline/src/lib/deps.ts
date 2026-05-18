import { exec } from "node:child_process";
import type { Platform } from "./platform";

const PROBE_TIMEOUT_MS = 10_000;
const VERSION_RE = /(\d+\.[\d.]+|\d{4}\.\d{2}\.\d{2})/;
const LINE_SEPARATOR_RE = /\r?\n/;

export const KNOWN_TOOLS = ["yt-dlp", "ffmpeg", "whisper-cpp"] as const;
export type Tool = (typeof KNOWN_TOOLS)[number];
export type ToolSource = "path";

export type ToolStatus =
  | { installed: false }
  | { installed: true; path: string; source: ToolSource; version: string };

type CommandSpec = [string, string[]];

type ToolDescriptor = {
  binNames: string[];
  brewPackage: string;
  linuxInstall: string;
  linuxUninstall: string;
  versionArgs: string;
  wingetId: string;
};

const TOOL_DESCRIPTORS: Record<Tool, ToolDescriptor> = {
  "yt-dlp": {
    binNames: ["yt-dlp"],
    versionArgs: "--version",
    brewPackage: "yt-dlp",
    wingetId: "yt-dlp.yt-dlp",
    linuxInstall:
      'mkdir -p "$HOME/.local/bin" && curl -L -o "$HOME/.local/bin/yt-dlp" https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp && chmod +x "$HOME/.local/bin/yt-dlp"',
    linuxUninstall: 'rm -f "$HOME/.local/bin/yt-dlp" "$HOME/bin/yt-dlp"',
  },
  ffmpeg: {
    binNames: ["ffmpeg"],
    versionArgs: "-version",
    brewPackage: "ffmpeg",
    wingetId: "Gyan.FFmpeg",
    linuxInstall:
      "(sudo apt-get update && sudo apt-get install -y ffmpeg) || (sudo dnf install -y ffmpeg)",
    linuxUninstall:
      "(sudo apt-get remove -y ffmpeg) || (sudo dnf remove -y ffmpeg)",
  },
  "whisper-cpp": {
    binNames: ["whisper-cli", "whisper-cpp", "whisper"],
    versionArgs: "--help",
    brewPackage: "whisper-cpp",
    wingetId: "ggerganov.whisper-cpp",
    linuxInstall:
      "git clone https://github.com/ggerganov/whisper.cpp /tmp/whisper.cpp && cd /tmp/whisper.cpp && make -j && sudo cp main /usr/local/bin/whisper-cli",
    linuxUninstall:
      "sudo rm -f /usr/local/bin/whisper-cli /usr/local/bin/whisper-cpp /usr/local/bin/whisper",
  },
};

function execCommand(
  command: string
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(command, { timeout: PROBE_TIMEOUT_MS }, (err, stdout, stderr) => {
      if (err) {
        reject(err);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

function quoteShell(value: string): string {
  return `"${value.replace(/(["\\$`])/g, "\\$1")}"`;
}

async function which(name: string): Promise<string | null> {
  try {
    const { stdout } = await execCommand(
      process.platform === "win32" ? `where ${name}` : `which ${name}`
    );
    const first = stdout
      .trim()
      .split(LINE_SEPARATOR_RE)
      .find((line) => line.length > 0);
    return first ?? null;
  } catch {
    return null;
  }
}

async function detectVersion(bin: string, args: string): Promise<string> {
  try {
    const { stderr, stdout } = await execCommand(`${quoteShell(bin)} ${args}`);
    const output = `${stdout}\n${stderr}`;
    const firstLine = output
      .trim()
      .split(LINE_SEPARATOR_RE)
      .find((line) => line.trim().length > 0);
    const match = output.match(VERSION_RE);
    const version = match ? match[1] : (firstLine ?? "").slice(0, 32);
    return version.length > 0 ? version : "unknown";
  } catch {
    return "unknown";
  }
}

export function defaultToolsForPlatform(_platform: Platform): Tool[] {
  return ["yt-dlp", "ffmpeg", "whisper-cpp"];
}

export async function checkTool(tool: Tool): Promise<ToolStatus> {
  const descriptor = TOOL_DESCRIPTORS[tool];
  for (const name of descriptor.binNames) {
    const path = await which(name);
    if (path) {
      const version = await detectVersion(name, descriptor.versionArgs);
      return { installed: true, path, source: "path", version };
    }
  }
  return { installed: false };
}

export function installCommand(platform: Platform, tool: Tool): CommandSpec {
  const descriptor = TOOL_DESCRIPTORS[tool];
  if (platform === "macos") {
    return ["brew", ["install", descriptor.brewPackage]];
  }
  if (platform === "windows") {
    return [
      "winget",
      [
        "install",
        "--id",
        descriptor.wingetId,
        "-e",
        "--accept-source-agreements",
        "--accept-package-agreements",
      ],
    ];
  }
  return ["sh", ["-c", descriptor.linuxInstall]];
}

export function uninstallCommand(platform: Platform, tool: Tool): CommandSpec {
  const descriptor = TOOL_DESCRIPTORS[tool];
  if (platform === "macos") {
    return ["brew", ["uninstall", descriptor.brewPackage]];
  }
  if (platform === "windows") {
    return [
      "winget",
      [
        "uninstall",
        "--id",
        descriptor.wingetId,
        "-e",
        "--accept-source-agreements",
      ],
    ];
  }
  return ["sh", ["-c", descriptor.linuxUninstall]];
}
