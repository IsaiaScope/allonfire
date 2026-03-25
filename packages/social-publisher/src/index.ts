// biome-ignore lint/performance/noBarrelFile: package entry point — consumers import from @allonfire/social-publisher
export {
  createLinkedInAdapter,
  createTwitterAdapter,
  createYouTubeAdapter,
  getAdapter,
} from "./adapters/index";
export type { PlatformAdapter } from "./adapters/types";
export { resizeAllForPlatform, resizeForPlatform } from "./image/index";
export type { ImageSpec } from "./image/specs";
export { PLATFORM_IMAGE_SPECS } from "./image/specs";
export {
  exchangeLinkedInCode,
  getLinkedInAuthUrl,
  refreshLinkedInToken,
} from "./oauth/linkedin";
export { refreshIfNeeded } from "./oauth/refresh";
export {
  exchangeTwitterCode,
  generateCodeVerifier,
  getTwitterAuthUrl,
  refreshTwitterToken,
} from "./oauth/twitter";
export type { OAuthConfig, TokenResponse } from "./oauth/types";
export {
  exchangeYouTubeCode,
  getYouTubeAuthUrl,
  refreshYouTubeToken,
} from "./oauth/youtube";
export type {
  DecryptedTokens,
  Platform,
  PublishRequest,
  PublishResult,
} from "./types";
