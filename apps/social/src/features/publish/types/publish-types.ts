import type { Platform } from "@allonfire/database";

export type WizardStep =
  | "compose"
  | "platforms"
  | "preview"
  | "confirm"
  | "results";

export type PlatformContent = {
  platform: Platform;
  adaptedContent: string;
  charCount: number;
  isOverLimit: boolean;
};

export type ConnectedAccount = {
  platform: Platform;
  platformUsername: string | null;
  connectedAt: Date;
};

export type PublishResultItem = {
  platform: Platform;
  success: boolean;
  platformPostId?: string;
  platformUrl?: string;
  error?: string;
};
