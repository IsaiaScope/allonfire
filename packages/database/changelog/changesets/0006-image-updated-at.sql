--liquibase formatted sql logicalFilePath:changesets/0006-image-updated-at.sql

--changeset isaia:0006-image-updated-at
--comment: An Image's last change, part of its Version (ADR 0028). Existing rows start at their createdAt; added nullable, filled, then required, since a NOT NULL column without a default cannot be added to rows.
-- AlterTable
ALTER TABLE "image"."Image" ADD COLUMN     "updatedAt" TIMESTAMP(3);
UPDATE "image"."Image" SET "updatedAt" = "createdAt";
ALTER TABLE "image"."Image" ALTER COLUMN "updatedAt" SET NOT NULL;
--rollback ALTER TABLE "image"."Image" DROP COLUMN "updatedAt";
