<h1 align="center">@allonfire/database</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?style=flat&logo=prisma&logoColor=white" alt="Prisma 6" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat&logo=postgresql&logoColor=white" alt="PostgreSQL 16" />
  <img src="https://img.shields.io/badge/Zod-4-3068B7?style=flat&logo=zod&logoColor=white" alt="Zod" />
  <img src="https://img.shields.io/badge/BetterAuth-1.2-000000?style=flat" alt="BetterAuth" />
</p>

<p align="center">Shared database layer for the AllOnFire monorepo. Provides a singleton Prisma client, typed service functions for every domain model, and encrypted credential storage. All apps and packages import from <code>@allonfire/database</code> instead of using Prisma directly.</p>

## Service Layer

```
@allonfire/database
  |
  |-- prisma          Singleton PrismaClient (dev: cached on globalThis)
  |
  |-- services/
  |     |-- topic.service         Topic discovery, pagination, selection, ingestion
  |     |-- prompt.service        Prompt CRUD, rating, few-shot retrieval
  |     |-- provider.service      AI provider management with encrypted API keys
  |     |-- settings.service      App-wide singleton settings (webhooks, active provider)
  |     |-- social-account.service   OAuth social account storage (encrypted tokens)
  |     |-- stats.service         Dashboard aggregations (topic stats, daily summary)
  |     |-- user.service          User lookup, management, and app access control
  |     |-- webhook-log.service   Webhook request/response logging
  |     |-- favorite.service      Photo favorite toggling and paginated retrieval
  |     |-- game-score.service    Game score submission, leaderboards, and stats
  |     |-- photo.service         Photo CRUD, pagination, and random selection
  |     |-- quiz.service          Quiz question/answer CRUD and random selection
  |
  |-- utils/
        |-- encryption            AES-256-GCM encrypt/decrypt helpers
```

## API Reference

### Topic Service

| Function | Description |
|---|---|
| `getDiscoveredTopics(limit?)` | Fetch recently discovered topics (default 50) |
| `getDiscoveredTopicsPaginated(params?)` | Cursor-paginated AI_PICKED topics with filtering and sorting |
| `getSelectedTopicsPaginated(params?)` | Cursor-paginated SELECTED topics with prompt ratings |
| `getTopicsByStatus(statuses, limit?)` | Fetch topics by one or more statuses |
| `getTopicWithPrompts(topicId)` | Single topic with all prompts |
| `selectTopic(topicId)` | Move topic to SELECTED status |
| `selectTopics(topicIds)` | Bulk-select topics |
| `ingestTopics(topics)` | Deduplicate by URL and create new topics |
| `deleteTopic(topicId)` | Delete topic, unlink posts (transaction) |
| `deleteAllTopics(category?, status?)` | Bulk delete with optional filters |
| `deleteSelectedTopics(filters?)` | Delete selected topics by rating/notes filters |

### Prompt Service

| Function | Description |
|---|---|
| `createPrompt(topicId, content, postType?)` | Create a prompt for a topic |
| `getPromptsByTopicId(topicId)` | All prompts for a topic (newest first) |
| `deletePrompt(promptId)` | Delete a single prompt |
| `ratePrompt(promptId, rating, note?)` | Rate POSITIVE or NEGATIVE with optional note |
| `updatePromptNote(promptId, note)` | Update just the rating note |
| `getPositivePromptsByCategory(category, limit?)` | Few-shot examples for generation |

### Provider Service

| Function | Description |
|---|---|
| `getProviders()` | List all providers (API keys masked) |
| `getActiveProvider()` | Get active provider with decrypted key |
| `getProviderWithDecryptedKey(provider)` | Get specific provider with decrypted key |
| `upsertProvider(data)` | Create or update a provider (encrypts key) |
| `setActiveProvider(providerId)` | Set the active AI provider |
| `deleteProvider(providerId)` | Remove a provider |

### Settings Service

| Function | Description |
|---|---|
| `getSettings()` | Get singleton settings with active provider |

### Social Account Service

| Function | Description |
|---|---|
| `getConnectedAccounts(userId)` | List connected platforms for a user |
| `getSocialAccount(userId, platform)` | Get account with decrypted tokens |
| `upsertSocialAccount(data)` | Connect or update a social account (encrypts tokens) |
| `deleteSocialAccount(userId, platform)` | Disconnect a platform |

### Stats Service

| Function | Description |
|---|---|
| `getTopicStats()` | Aggregated counts by status, rating, and notes |
| `getDailySummary()` | Today's new topics, generated posts, published posts |

### User Service

| Function | Description |
|---|---|
| `getUserById(userId)` | Fetch a single user |
| `getUsers()` | List all users |
| `deleteUser(userId)` | Delete a user |
| `checkUserAppAccess(userId, appName)` | Check if a user has access to a specific app |
| `updateUserAllowedApps(userId, allowedApps)` | Update a user's allowed apps list |

### Webhook Log Service

| Function | Description |
|---|---|
| `logWebhook(data)` | Record a webhook request with payload and response |

### Favorite Service

| Function | Description |
|---|---|
| `toggleFavorite(photoId)` | Toggle favorite status on a photo |
| `getFavoritePhotoIds(photoIds)` | Get set of favorited photo IDs from a list |
| `getFavoritesPaginated(cursor?, limit?)` | Cursor-paginated favorited photos |

### Game Score Service

| Function | Description |
|---|---|
| `submitGameScore(data)` | Submit a game score (userId, gameType, timeMs, score, metadata) |
| `getLeaderboard(gameType, limit?)` | Top scores per user for a game type (default 25) |
| `getUserBestScore(userId, gameType)` | Best score for a user in a game type |
| `getUserGameStats(userId)` | Total games and per-type counts for a user |
| `getGameStats(gameType)` | Aggregate stats: total games, unique players, avg/best time |

### Photo Service

| Function | Description |
|---|---|
| `getPhotosPaginated(cursor?, limit?)` | Cursor-paginated photos with uploader info |
| `createPhoto(data)` | Create a photo record (url, thumbnailUrl, dimensions, blurHash) |
| `deletePhoto(id)` | Delete a photo |
| `getPhotoCount()` | Total photo count |
| `getRandomPhotos(userId, count)` | Random deduplicated photos for a user |
| `getAllRandomPhotos(count)` | Random deduplicated photos across all users |
| `getUserPhotoCount(userId)` | Count of distinct photos uploaded by a user |

### Quiz Service

| Function | Description |
|---|---|
| `createQuizQuestion(data)` | Create a question with answers (text, images, correctness) |
| `getRandomQuizQuestions(count?)` | Random quiz questions with answers (default 10) |
| `getQuizQuestionCount()` | Total question count |
| `getAllQuizQuestions()` | All questions ordered by newest, with answer counts |
| `getQuizQuestionById(id)` | Single question with ordered answers |
| `updateQuizQuestion(id, data)` | Replace question text/images and all answers (transaction) |
| `deleteQuizQuestion(id)` | Delete a question and its answers |

## Key Models

| Model | Purpose | Key Fields |
|---|---|---|
| `Topic` | Discovered content from RSS/APIs | `title`, `summary`, `sourceUrl`, `category`, `status` |
| `Prompt` | Generated text prompts for AI submission | `topicId`, `content`, `postType`, `rating`, `ratingNote` |
| `Post` | Social media posts across platforms | `topicId`, `platform`, `status`, `content`, `mediaUrl` |
| `User` | Admin users (BetterAuth-managed) | `email`, `name`, `role` |
| `SocialAccount` | Connected OAuth accounts (encrypted tokens) | `userId`, `platform`, `accessToken`, `refreshToken` |
| `AiProvider` | AI service credentials (encrypted API keys) | `provider`, `apiKey`, `model`, `isVerified` |
| `Settings` | Singleton app configuration | `webhookDiscoveryUrl`, `webhookNotifyUrl`, `activeProviderId` |
| `WebhookLog` | Audit trail for webhook calls | `endpoint`, `method`, `payload`, `response`, `status` |
| `Photo` | Uploaded family photos | `url`, `thumbnailUrl`, `width`, `height`, `blurHash`, `uploadedBy` |
| `Favorite` | Favorited photos | `photoId` |
| `GameScore` | Game scores and leaderboard entries | `userId`, `gameType`, `timeMs`, `score`, `metadata` |
| `QuizQuestion` | Quiz questions with optional images | `text`, `imageUrl`, `createdBy` |
| `QuizAnswer` | Answers for quiz questions | `questionId`, `text`, `isCorrect`, `sortOrder` |

### Enums

| Enum | Values |
|---|---|
| `TopicCategory` | `NEWS`, `MEME_WORTHY`, `LEARNING`, `TOOL_RELEASE`, `AI_UPDATE` |
| `TopicStatus` | `DISCOVERED`, `AI_PICKED`, `SELECTED` |
| `PostType` | `MEME`, `NEWS`, `LEARNING`, `FREEFORM` |
| `PostStatus` | `DRAFT`, `APPROVED`, `PUBLISHED`, `FAILED` |
| `Platform` | `LINKEDIN`, `TWITTER` |
| `MediaType` | `IMAGE`, `CAROUSEL`, `VIDEO_SCRIPT` |
| `ProviderType` | `ANTHROPIC`, `OPENROUTER`, `GOOGLE_GEMINI`, `GROQ` |
| `Role` | `ADMIN`, `USER`, `VIEWER` |
| `GameType` | `MEMORY`, `QUIZ` |

## Directory Structure

```
packages/database/
  prisma/
    schema.prisma           Schema definition (PostgreSQL)
  generated/
    prisma/                 Generated Prisma client (gitignored)
  src/
    index.ts                Public API: prisma client, types, service re-exports
    env.ts                  Zod-validated DATABASE_URL
    seed.ts                 Database seeding script
    seed-env.ts             Seed-specific environment config
    services/
      index.ts              Service barrel (single entry point)
      topic.service.ts      Topic CRUD, pagination, ingestion
      prompt.service.ts     Prompt CRUD and rating
      provider.service.ts   AI provider management
      settings.service.ts   Singleton settings
      social-account.service.ts  Social OAuth account storage
      stats.service.ts      Dashboard aggregations
      user.service.ts       User management and app access control
      webhook-log.service.ts  Webhook audit logging
      favorite.service.ts   Photo favorite toggling and retrieval
      game-score.service.ts Game score submission and leaderboards
      photo.service.ts      Photo CRUD, pagination, random selection
      quiz.service.ts       Quiz question/answer CRUD
    utils/
      encryption.ts         AES-256-GCM encrypt/decrypt
```

## Usage

Import the singleton client and service functions from the package root:

```ts
// Fetch topics for the discover page
import { getDiscoveredTopicsPaginated } from "@allonfire/database";

const { topics, nextCursor, totalCount } = await getDiscoveredTopicsPaginated({
  category: "NEWS",
  sort: "newest",
  limit: 20,
});
```

```ts
// Get dashboard stats for the overview page
import { getDailySummary, getTopicStats } from "@allonfire/database";

const [stats, daily] = await Promise.all([
  getTopicStats(),
  getDailySummary(),
]);
```

```ts
// Direct Prisma access when services don't cover the query
import { prisma } from "@allonfire/database";

const post = await prisma.post.findUnique({
  where: { id: postId },
  include: { topic: true },
});
```

## Scripts

| Command | Description |
|---|---|
| `pnpm db:generate` | Regenerate the Prisma client |
| `pnpm db:push` | Push schema changes to the database |
| `pnpm db:migrate` | Run development migrations |
| `pnpm db:seed` | Seed the database |
| `pnpm db:seed-quiz` | Seed quiz questions |
| `pnpm db:export-topics` | Export topics to file |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm test` | Run tests with Vitest |

## Exports

| Path | Description |
|---|---|
| `@allonfire/database` | Prisma client, types, and all service re-exports |
| `@allonfire/database/env` | Zod-validated environment variables |
| `@allonfire/database/services` | Service barrel (single entry point) |
| `@allonfire/database/generated/prisma` | Generated Prisma client and types |

## Dependencies

| Package | Purpose |
|---|---|
| `@prisma/client` | Generated database client |
| `prisma` | Schema management and migrations |
| `@t3-oss/env-core` | Type-safe environment variable validation |
| `better-auth` | Authentication integration (User/Session/Account models) |
| `zod` | Runtime schema validation |
