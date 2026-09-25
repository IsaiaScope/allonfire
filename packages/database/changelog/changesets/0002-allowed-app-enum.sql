--liquibase formatted sql logicalFilePath:changesets/0002-allowed-app-enum.sql

--changeset isaia:0002-allowed-app-enum
--comment: Allowed apps become an enum like Role; Prisma names them ALL and LAURA and @maps them to the stored values, which do not change. Converts in place (the Prisma draft dropped the column). Names of Apps that no longer exist (social) are dropped first, since they already grant nothing; a subquery cannot sit in ALTER ... USING, so that is an UPDATE.
CREATE TYPE "auth"."AllowedApp" AS ENUM ('all', 'laura');
UPDATE "auth"."User" SET "allowedApps" = ARRAY(
  SELECT app FROM unnest("allowedApps") AS app WHERE app IN ('all', 'laura')
);
ALTER TABLE "auth"."User" ALTER COLUMN "allowedApps" DROP DEFAULT;
ALTER TABLE "auth"."User" ALTER COLUMN "allowedApps" TYPE "auth"."AllowedApp"[] USING "allowedApps"::TEXT[]::"auth"."AllowedApp"[];
ALTER TABLE "auth"."User" ALTER COLUMN "allowedApps" SET DEFAULT ARRAY['all']::"auth"."AllowedApp"[];
--rollback ALTER TABLE "auth"."User" ALTER COLUMN "allowedApps" DROP DEFAULT;
--rollback ALTER TABLE "auth"."User" ALTER COLUMN "allowedApps" TYPE TEXT[] USING "allowedApps"::TEXT[];
--rollback ALTER TABLE "auth"."User" ALTER COLUMN "allowedApps" SET DEFAULT ARRAY['all']::TEXT[];
--rollback DROP TYPE "auth"."AllowedApp";
