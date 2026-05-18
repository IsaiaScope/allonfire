import { spawn } from "node:child_process";

export type RunClaudeOptions = {
  allowedTools?: string[];
  prompt: string;
  input: string;
  cwd?: string;
};

export function runClaude({
  allowedTools = [],
  prompt,
  input,
  cwd,
}: RunClaudeOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "claude",
      [
        "--print",
        "--output-format",
        "text",
        "--no-session-persistence",
        "--permission-mode",
        "dontAsk",
        "--tools",
        allowedTools.join(","),
        "--setting-sources",
        "",
        "--strict-mcp-config",
        "--mcp-config",
        '{"mcpServers":{}}',
      ],
      {
        cwd,
        stdio: ["pipe", "pipe", "pipe"],
      }
    );

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(
          new Error(
            `claude exited with code ${code}. stderr: ${stderr.slice(-500)}`
          )
        );
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to spawn claude: ${err.message}`));
    });

    proc.stdin.write(`${prompt}\n\n${input}`);
    proc.stdin.end();
  });
}
