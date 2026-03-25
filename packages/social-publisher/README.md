<h1 align="center">@allonfire/social-publisher</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Twitter_API-v2-1DA1F2?style=flat&logo=twitter&logoColor=white" alt="Twitter API v2" />
  <img src="https://img.shields.io/badge/LinkedIn_API-REST-0A66C2?style=flat&logo=linkedin&logoColor=white" alt="LinkedIn API" />
  <img src="https://img.shields.io/badge/Sharp-0.33-99CC00?style=flat&logo=sharp&logoColor=white" alt="Sharp" />
</p>

<p align="center">Unified publishing layer for social media platforms. Handles OAuth authentication, platform-specific image resizing, and posting through a consistent adapter interface.</p>

## Publish Flow

```
PublishRequest
  --> getAdapter(platform)
    --> resizeAllForPlatform(images, platform)
      --> adapter.publish(request, tokens)
        --> PublishResult { success, platformPostId, platformUrl }
```

Each step is independently importable. The caller orchestrates the pipeline -- this package provides the building blocks, not an opinionated workflow.

## Platform Adapters

| Platform   | Text | Images | Image Upload Method              | Token Validation | Post URL Format                              |
| ---------- | ---- | ------ | -------------------------------- | ---------------- | -------------------------------------------- |
| Twitter    | Yes  | No\*   | v1 media upload (requires Basic) | `v2.me()`        | `twitter.com/i/web/status/{id}`              |
| LinkedIn   | Yes  | Yes    | UGC asset register + binary PUT  | `/userinfo` GET  | `linkedin.com/feed/update/{urn}`             |

\* Twitter image upload requires Basic tier ($100/mo). The code is scaffolded but commented out until the plan is upgraded.

### Adapter Interface

Every adapter implements `PlatformAdapter`:

```ts
type PlatformAdapter = {
  publish(request: PublishRequest, tokens: DecryptedTokens): Promise<PublishResult>;
  validateTokens(tokens: DecryptedTokens): Promise<boolean>;
};
```

Use `getAdapter(platform)` to retrieve the correct adapter by `Platform` enum value (`"TWITTER"` | `"LINKEDIN"`).

## OAuth Flow

The OAuth module handles the full authorization code flow for each platform, plus token refresh with automatic expiry detection.

**Per-platform functions:**

| Function                | Platform | Description                              |
| ----------------------- | -------- | ---------------------------------------- |
| `getTwitterAuthUrl`     | Twitter  | Generates PKCE auth URL + code verifier  |
| `exchangeTwitterCode`   | Twitter  | Exchanges auth code for tokens           |
| `refreshTwitterToken`   | Twitter  | Refreshes an expired access token        |
| `getLinkedInAuthUrl`    | LinkedIn | Generates standard OAuth2 auth URL       |
| `exchangeLinkedInCode`  | LinkedIn | Exchanges auth code for tokens           |
| `refreshLinkedInToken`  | LinkedIn | Refreshes an expired access token        |
| `refreshIfNeeded`       | Both     | Auto-refreshes if token expires within 5 min |

**OAuth scopes requested:**

- **Twitter:** `tweet.write`, `tweet.read`, `users.read`, `offline.access`
- **LinkedIn:** `openid`, `profile`, `w_member_social`

## Image Processing

Images are resized per-platform using Sharp. The resize pipeline progressively reduces JPEG quality (from 90 down to 40 in steps of 10) until the output fits within the platform's size limit.

**Platform image specs:**

| Platform | Max Width | Max Height | Max Size | Output Formats     |
| -------- | --------- | ---------- | -------- | ------------------ |
| Twitter  | 1200px    | 675px      | 5 MB     | JPEG, PNG, WebP    |
| LinkedIn | 1200px    | 627px      | 10 MB    | JPEG, PNG          |

All images are output as JPEG after processing. The `fit: "inside"` strategy preserves aspect ratio without enlargement.

## API Reference

| Export                  | Type     | Description                                   |
| ----------------------- | -------- | --------------------------------------------- |
| `getAdapter`            | Function | Returns a `PlatformAdapter` for the given platform |
| `createTwitterAdapter`  | Function | Creates a Twitter adapter instance             |
| `createLinkedInAdapter` | Function | Creates a LinkedIn adapter instance            |
| `resizeForPlatform`     | Function | Resizes a single image buffer for a platform   |
| `resizeAllForPlatform`  | Function | Resizes an array of images for a platform      |
| `PLATFORM_IMAGE_SPECS`  | Constant | Image dimension/size constraints per platform  |
| `getTwitterAuthUrl`     | Function | Generates Twitter OAuth2 PKCE auth URL         |
| `exchangeTwitterCode`   | Function | Exchanges Twitter auth code for tokens         |
| `refreshTwitterToken`   | Function | Refreshes a Twitter access token               |
| `getLinkedInAuthUrl`    | Function | Generates LinkedIn OAuth2 auth URL             |
| `exchangeLinkedInCode`  | Function | Exchanges LinkedIn auth code for tokens        |
| `refreshLinkedInToken`  | Function | Refreshes a LinkedIn access token              |
| `refreshIfNeeded`       | Function | Auto-refreshes token if expiring within 5 min  |
| `PlatformAdapter`       | Type     | Adapter interface (publish + validateTokens)   |
| `PublishRequest`        | Type     | Input: content string + optional images        |
| `PublishResult`         | Type     | Output: success flag, post ID, URL, error      |
| `DecryptedTokens`       | Type     | Decrypted access/refresh tokens + expiry       |
| `OAuthConfig`           | Type     | Client ID, secret, and redirect URI            |
| `TokenResponse`         | Type     | Normalized token response from OAuth exchange  |
| `ImageSpec`             | Type     | Max dimensions and size for a platform         |

## Directory Structure

```
src/
  index.ts                  Main entry point, re-exports all public API
  types.ts                  Shared types (PublishRequest, PublishResult, etc.)
  adapters/
    index.ts                Adapter registry and getAdapter()
    types.ts                PlatformAdapter interface
    twitter.ts              Twitter v2 adapter
    linkedin.ts             LinkedIn UGC adapter
  oauth/
    index.ts                OAuth entry point
    types.ts                OAuthConfig, TokenResponse types
    twitter.ts              Twitter OAuth2 PKCE flow
    linkedin.ts             LinkedIn OAuth2 flow
    refresh.ts              Cross-platform token refresh logic
  image/
    index.ts                Image module entry point
    specs.ts                Per-platform image constraints
    resize.ts               Sharp-based resize pipeline
```

## Dependencies

| Package              | Purpose                          |
| -------------------- | -------------------------------- |
| `twitter-api-v2`     | Twitter API v2 client and OAuth  |
| `linkedin-api-client`| LinkedIn REST API client         |
| `sharp`              | High-performance image resizing  |
| `@allonfire/database` | Platform enum and DB types      |
| `@allonfire/utils`   | Error formatting utilities       |
