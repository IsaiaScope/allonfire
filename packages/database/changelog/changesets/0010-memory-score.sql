--liquibase formatted sql logicalFilePath:changesets/0010-memory-score.sql

--changeset isaia:0010-memory-score
--comment: Memory is Laura's only game (spec, decision 5) and a score belongs to the User's Laura Profile (ADR 0034). QUIZ scores, games the old leaderboard never listed (no time or score), games no player can produce (under 6 moves) and the scores of Users with no Laura Membership are deleted; every other scorer gets a Profile with a copy of the master Favorites; the game type, its enum and the unused metadata go; GameScore becomes MemoryScore, keyed to the Profile. Rolling back restores the shape and marks every row MEMORY, never the deleted rows.
DELETE FROM "laura"."GameScore" WHERE "gameType" = 'QUIZ' OR "score" IS NULL OR "timeMs" IS NULL OR "score" < 6 OR "timeMs" <= 0;
DELETE FROM "laura"."GameScore" g WHERE NOT EXISTS (SELECT 1 FROM "auth"."Membership" m WHERE m."userId" = g."userId" AND m."app" = 'laura');
WITH made AS (INSERT INTO "laura"."Profile" ("userId") SELECT DISTINCT "userId" FROM "laura"."GameScore" ON CONFLICT DO NOTHING RETURNING "userId") INSERT INTO "laura"."ProfileFavorite" ("userId", "imageId", "app", "createdAt") SELECT made."userId", f."imageId", f."app", f."createdAt" FROM made CROSS JOIN "laura"."Favorite" f;
ALTER TABLE "laura"."GameScore" DROP CONSTRAINT "GameScore_userId_fkey";
ALTER TABLE "laura"."GameScore" DROP COLUMN "gameType", DROP COLUMN "metadata";
DROP TYPE "laura"."GameType";
ALTER TABLE "laura"."GameScore" ALTER COLUMN "score" SET NOT NULL, ALTER COLUMN "timeMs" SET NOT NULL, ADD COLUMN "app" "auth"."App" NOT NULL DEFAULT 'laura';
ALTER TABLE "laura"."GameScore" RENAME TO "MemoryScore";
ALTER TABLE "laura"."MemoryScore" RENAME CONSTRAINT "GameScore_pkey" TO "MemoryScore_pkey";
-- Prisma cannot express a CHECK: the app column exists only to name the Profile's key, so it is a constant; 12 cards cannot be matched in fewer than 6 moves.
ALTER TABLE "laura"."MemoryScore" ADD CONSTRAINT "MemoryScore_app_check" CHECK ("app" = 'laura');
ALTER TABLE "laura"."MemoryScore" ADD CONSTRAINT "MemoryScore_plausible_check" CHECK ("score" >= 6 AND "timeMs" > 0);
CREATE INDEX "MemoryScore_score_timeMs_idx" ON "laura"."MemoryScore"("score", "timeMs");
CREATE INDEX "MemoryScore_userId_score_timeMs_idx" ON "laura"."MemoryScore"("userId", "score", "timeMs");
ALTER TABLE "laura"."MemoryScore" ADD CONSTRAINT "MemoryScore_userId_app_fkey" FOREIGN KEY ("userId", "app") REFERENCES "laura"."Profile"("userId", "app") ON DELETE CASCADE ON UPDATE CASCADE;
--rollback ALTER TABLE "laura"."MemoryScore" DROP CONSTRAINT "MemoryScore_userId_app_fkey";
--rollback DROP INDEX "laura"."MemoryScore_userId_score_timeMs_idx";
--rollback DROP INDEX "laura"."MemoryScore_score_timeMs_idx";
--rollback ALTER TABLE "laura"."MemoryScore" DROP CONSTRAINT "MemoryScore_plausible_check";
--rollback ALTER TABLE "laura"."MemoryScore" DROP CONSTRAINT "MemoryScore_app_check";
--rollback ALTER TABLE "laura"."MemoryScore" RENAME CONSTRAINT "MemoryScore_pkey" TO "GameScore_pkey";
--rollback ALTER TABLE "laura"."MemoryScore" RENAME TO "GameScore";
--rollback CREATE TYPE "laura"."GameType" AS ENUM ('MEMORY', 'QUIZ');
--rollback ALTER TABLE "laura"."GameScore" DROP COLUMN "app", ALTER COLUMN "score" DROP NOT NULL, ALTER COLUMN "timeMs" DROP NOT NULL, ADD COLUMN "metadata" JSONB, ADD COLUMN "gameType" "laura"."GameType" NOT NULL DEFAULT 'MEMORY';
--rollback ALTER TABLE "laura"."GameScore" ALTER COLUMN "gameType" DROP DEFAULT;
--rollback CREATE INDEX "GameScore_gameType_timeMs_idx" ON "laura"."GameScore"("gameType", "timeMs");
--rollback CREATE INDEX "GameScore_gameType_score_idx" ON "laura"."GameScore"("gameType", "score");
--rollback CREATE INDEX "GameScore_userId_gameType_idx" ON "laura"."GameScore"("userId", "gameType");
--rollback ALTER TABLE "laura"."GameScore" ADD CONSTRAINT "GameScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
