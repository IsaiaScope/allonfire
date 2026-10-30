--liquibase formatted sql logicalFilePath:changesets/0005-user-image-blur.sql

--changeset isaia:0005-user-image-blur
-- AlterTable
ALTER TABLE "auth"."User" ADD COLUMN     "imageBlurDataUrl" TEXT;
--rollback ALTER TABLE "auth"."User" DROP COLUMN "imageBlurDataUrl";
