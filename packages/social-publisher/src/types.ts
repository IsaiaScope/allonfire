export type { Platform } from "@allonfire/database";

export type DecryptedTokens = {
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
};

export type PublishRequest = {
  content: string;
  imageBuffer?: Buffer;
  imageMimeType?: string;
};

export type PublishResult = {
  success: boolean;
  platformPostId?: string;
  platformUrl?: string;
  error?: string;
};
