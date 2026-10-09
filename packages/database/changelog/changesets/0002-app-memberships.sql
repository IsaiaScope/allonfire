--liquibase formatted sql logicalFilePath:changesets/0002-app-memberships.sql

--changeset isaia:0002-app-memberships
--comment: A User's Role moves into one Membership per App (ADR 0019) and nothing spans every App, so the enum names Apps only. Each baseline User keeps their Role in every App their Allowed apps reached: all reached every App, laura Laura; other names (social) reached nothing.
CREATE TYPE "auth"."App" AS ENUM ('laura', 'back-office');
CREATE TABLE "auth"."Membership" (
    "userId" TEXT NOT NULL,
    "app" "auth"."App" NOT NULL,
    "role" "auth"."Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Membership_pkey" PRIMARY KEY ("userId", "app")
);
ALTER TABLE "auth"."Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
INSERT INTO "auth"."Membership" ("userId", "app", "role")
SELECT u."id", a."app", u."role"
FROM "auth"."User" u
CROSS JOIN unnest(enum_range(NULL::"auth"."App")) AS a("app")
WHERE 'all' = ANY(u."allowedApps") OR a."app"::TEXT = ANY(u."allowedApps");
ALTER TABLE "auth"."User" DROP COLUMN "role";
ALTER TABLE "auth"."User" DROP COLUMN "allowedApps";
--rollback ALTER TABLE "auth"."User" ADD COLUMN "role" "auth"."Role" NOT NULL DEFAULT 'USER';
--rollback ALTER TABLE "auth"."User" ADD COLUMN "allowedApps" TEXT[] DEFAULT ARRAY['all']::TEXT[];
--rollback UPDATE "auth"."User" u SET "role" = m."role", "allowedApps" = m."apps" FROM (SELECT "userId", array_agg("app"::TEXT ORDER BY "app") AS "apps", (array_agg("role" ORDER BY CASE "role" WHEN 'ADMIN' THEN 1 WHEN 'USER' THEN 2 ELSE 3 END))[1] AS "role" FROM "auth"."Membership" GROUP BY "userId") m WHERE u."id" = m."userId";
--rollback UPDATE "auth"."User" SET "role" = 'VIEWER', "allowedApps" = '{}' WHERE "id" NOT IN (SELECT "userId" FROM "auth"."Membership");
--rollback DROP TABLE "auth"."Membership";
--rollback DROP TYPE "auth"."App";
