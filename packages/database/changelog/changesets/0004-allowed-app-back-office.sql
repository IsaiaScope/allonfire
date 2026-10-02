--liquibase formatted sql logicalFilePath:changesets/0004-allowed-app-back-office.sql

--changeset isaia:0004-allowed-app-back-office
--comment: The Back office becomes an Allowed app, so Images and Users can name it. Postgres cannot drop an enum value, so the rollback rebuilds the type; it fails while any row still uses back-office, which is the safe outcome.
-- AlterEnum
ALTER TYPE "auth"."AllowedApp" ADD VALUE 'back-office';
--rollback ALTER TYPE "auth"."AllowedApp" RENAME TO "AllowedApp_old";
--rollback CREATE TYPE "auth"."AllowedApp" AS ENUM ('all', 'laura');
--rollback ALTER TABLE "auth"."User" ALTER COLUMN "allowedApps" DROP DEFAULT;
--rollback ALTER TABLE "auth"."User" ALTER COLUMN "allowedApps" TYPE "auth"."AllowedApp"[] USING "allowedApps"::TEXT[]::"auth"."AllowedApp"[];
--rollback ALTER TABLE "auth"."User" ALTER COLUMN "allowedApps" SET DEFAULT ARRAY['all']::"auth"."AllowedApp"[];
--rollback ALTER TABLE "image"."Image" ALTER COLUMN "app" TYPE "auth"."AllowedApp" USING "app"::TEXT::"auth"."AllowedApp";
--rollback DROP TYPE "auth"."AllowedApp_old";
