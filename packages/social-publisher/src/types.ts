export type { Platform } from "@allonfire/database";

export type DecryptedTokens = {
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
};

export type ImagePayload = {
  buffer: Buffer;
  mimeType: string;
};

export type PublishRequest = {
  content: string;
  images?: ImagePayload[];
};

export type PublishResult = {
  success: boolean;
  platformPostId?: string;
  platformUrl?: string;
  error?: string;
};
