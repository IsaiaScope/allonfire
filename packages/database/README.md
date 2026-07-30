<h1 align="center">@allonfire/database</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?style=flat&logo=prisma&logoColor=white" alt="Prisma 6" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat&logo=postgresql&logoColor=white" alt="PostgreSQL 16" />
  <img src="https://img.shields.io/badge/Zod-4-3068B7?style=flat&logo=zod&logoColor=white" alt="Zod" />
  <img src="https://img.shields.io/badge/BetterAuth-1.2-000000?style=flat" alt="BetterAuth" />
</p>

<p align="center">Shared database layer for the AllOnFire monorepo. Provides a singleton Prisma client and typed service functions for every domain model. All apps and packages import from <code>@allonfire/database</code> instead of using Prisma directly.</p>

## Service Layer

```
@allonfire/database
  |
  |-- prisma          Singleton PrismaClient (dev: cached on globalThis)
  |
  |-- services/
  |     |-- user.service          User lookup, management, and app access control
  |     |-- favorite.service      Photo favorite toggling and paginated retrieval
  |     |-- game-score.service    Game score submission, leaderboards, and stats
  |     |-- photo.service         Photo CRUD, pagination, and random selection
  |     |-- quiz.service          Quiz question/answer CRUD and random selection
  |
  |-- utils/
        |-- encryption            AES-256-GCM helpers (not re-exported from the package root)
```

## API Reference

### User Service

| Function | Description |
|---|---|
| `getUserById(userId)` | Fetch a single user |
| `getUsers()` | List all users |
| `deleteUser(userId)` | Delete a user |
| `checkUserAppAccess(userId, appName)` | Check if a user has access to a specific app |
| `updateUserAllowedApps(userId, allowedApps)` | Update a user's allowed apps list |

### Favorite Service

| Function | Description |
|---|---|
| `toggleFavorite(photoId)` | Toggle favorite status on a photo |
| `getFavoritePhotoIds(photoIds)` | Get set of favorited photo IDs from a list |
| `getFavoritesPaginated(cursor?, limit?)` | Cursor-paginated favorited photos (default 50 per page) |

### Game Score Service

| Function | Description |
|---|---|
| `submitGameScore(data)` | Submit a game score (userId, gameType, timeMs, score, metadata) |
| `getLeaderboard(gameType, limit?)` | Top scores per user for a game type (default 25) |
| `getUserBestScore(userId, gameType)` | Best score for a user in a game type |
| `getGlobalBestScore(gameType)` | Best score across all users for a game type |
| `getUserGameStats(userId)` | Total games and per-type counts for a user |
| `getGameStats(gameType)` | Aggregate stats: total games, unique players, avg/best time |

### Photo Service

| Function | Description |
|---|---|
| `getPhotosPaginated(cursor?, limit?)` | Cursor-paginated photos with uploader info (default 50 per page) |
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
| `User` | Accounts, BetterAuth-managed | `email`, `name`, `role`, `allowedApps` |
| `Session` | Active sessions, BetterAuth-managed | `userId`, `token`, `expiresAt` |
| `Account` | Credential and OAuth links, BetterAuth-managed | `userId`, `providerId`, `accountId` |
| `Verification` | Email/token verification, BetterAuth-managed | `identifier`, `value`, `expiresAt` |
| `Photo` | Uploaded family photos | `url`, `thumbnailUrl`, `width`, `height`, `blurHash`, `uploadedBy` |
| `Favorite` | Favorited photos (one row per photo, globally shared) | `photoId` |
| `GameScore` | Game scores and leaderboard entries | `userId`, `gameType`, `timeMs`, `score`, `metadata` |
| `QuizQuestion` | Quiz questions with optional images | `text`, `imageUrl`, `createdBy` |
| `QuizAnswer` | Answers for quiz questions | `questionId`, `text`, `isCorrect`, `sortOrder` |

### Enums

| Enum | Values |
|---|---|
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
    seed-quiz.ts            Quiz question seeding script
    seed-env.ts             Seed-specific environment config
    services/
      index.ts              Service barrel (single entry point)
      user.service.ts       User management and app access control
      favorite.service.ts   Photo favorite toggling and retrieval
      game-score.service.ts Game score submission and leaderboards
      photo.service.ts      Photo CRUD, pagination, random selection
      quiz.service.ts       Quiz question/answer CRUD
    utils/
      encryption.ts         AES-256-GCM encrypt/decrypt
      encryption.test.ts    Encryption round-trip tests
```

## Usage

Import the singleton client and service functions from the package root:

```ts
// Fetch a page of photos for the gallery
import { getPhotosPaginated } from "@allonfire/database";

const { photos, nextCursor } = await getPhotosPaginated(undefined, 20);
```

```ts
// Build the memory game leaderboard
import { getGameStats, getLeaderboard } from "@allonfire/database";

const [leaderboard, stats] = await Promise.all([
  getLeaderboard("MEMORY", 25),
  getGameStats("MEMORY"),
]);
```

```ts
// Direct Prisma access when services don't cover the query
import { prisma } from "@allonfire/database";

const photo = await prisma.photo.findUnique({
  where: { id: photoId },
  include: { user: true },
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
