--liquibase formatted sql logicalFilePath:changesets/0004-image-access.sql

--changeset isaia:0004-image-access
--comment: An Image is public or private as a whole (ADR 0027), private by default; the per-App public flag goes. Production is rebuilt, so nothing is carried over.
-- CreateEnum
CREATE TYPE "image"."ImageAccess" AS ENUM ('public', 'private');

-- AlterTable
ALTER TABLE "image"."Image" ADD COLUMN     "access" "image"."ImageAccess" NOT NULL DEFAULT 'private';

-- AlterTable
ALTER TABLE "image"."ImageApp" DROP COLUMN "public";
--rollback ALTER TABLE "image"."Image" DROP COLUMN "access";
--rollback ALTER TABLE "image"."ImageApp" ADD COLUMN     "public" BOOLEAN NOT NULL DEFAULT false;
--rollback DROP TYPE "image"."ImageAccess";
