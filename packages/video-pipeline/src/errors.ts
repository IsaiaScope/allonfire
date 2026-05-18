export class PipelineError extends Error {
  readonly stage: string;
  readonly projectFolder: string;
  readonly cause?: unknown;

  constructor(
    stage: string,
    projectFolder: string,
    message: string,
    cause?: unknown
  ) {
    super(`[${stage}] ${message}`);
    this.stage = stage;
    this.projectFolder = projectFolder;
    this.cause = cause;
    this.name = "PipelineError";
  }
}

export class ToolMissingError extends Error {
  readonly tool: string;

  constructor(tool: string) {
    super(
      `Required tool '${tool}' not found. Run \`pnpm video install ${tool}\` to install it.`
    );
    this.tool = tool;
    this.name = "ToolMissingError";
  }
}

export class LockHeldError extends Error {
  readonly projectFolder: string;
  readonly holderPid: number;

  constructor(projectFolder: string, holderPid: number) {
    super(
      `Project '${projectFolder}' is locked by another process (pid ${holderPid}).`
    );
    this.projectFolder = projectFolder;
    this.holderPid = holderPid;
    this.name = "LockHeldError";
  }
}
