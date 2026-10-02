--liquibase formatted sql logicalFilePath:changesets/0003-image-schema.sql

--changeset isaia:0003-image-schema
--comment: Images move to a shared image schema (ADR 0013); Laura's Photo, Favorite, QuizQuestion and QuizAnswer are dropped with the code that used them. Rollback recreates them empty: the data is gone by design.
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "image";

-- DropForeignKey
ALTER TABLE "laura"."Favorite" DROP CONSTRAINT "Favorite_photoId_fkey";

-- DropForeignKey
ALTER TABLE "laura"."Photo" DROP CONSTRAINT "Photo_uploadedBy_fkey";

-- DropForeignKey
ALTER TABLE "laura"."QuizAnswer" DROP CONSTRAINT "QuizAnswer_questionId_fkey";

-- DropForeignKey
ALTER TABLE "laura"."QuizQuestion" DROP CONSTRAINT "QuizQuestion_createdBy_fkey";

-- DropTable
DROP TABLE "laura"."Favorite";

-- DropTable
DROP TABLE "laura"."Photo";

-- DropTable
DROP TABLE "laura"."QuizAnswer";

-- DropTable
DROP TABLE "laura"."QuizQuestion";

-- CreateTable
CREATE TABLE "image"."Image" (
    "id" TEXT NOT NULL,
    "app" "auth"."AllowedApp" NOT NULL,
    "key" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "bytes" INTEGER NOT NULL,
    "blurDataUrl" TEXT NOT NULL,
    "alt" JSONB NOT NULL,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Image_key_key" ON "image"."Image"("key");

-- CreateIndex
CREATE INDEX "Image_app_createdAt_idx" ON "image"."Image"("app", "createdAt");

-- AddForeignKey
ALTER TABLE "image"."Image" ADD CONSTRAINT "Image_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "auth"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
--rollback ALTER TABLE "image"."Image" DROP CONSTRAINT "Image_uploadedBy_fkey";
--rollback DROP TABLE "image"."Image";
--rollback DROP SCHEMA "image";
--rollback CREATE TABLE "laura"."Favorite" (
--rollback     "id" TEXT NOT NULL,
--rollback     "photoId" TEXT NOT NULL,
--rollback     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
--rollback     CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
--rollback );
--rollback CREATE TABLE "laura"."Photo" (
--rollback     "id" TEXT NOT NULL,
--rollback     "url" TEXT NOT NULL,
--rollback     "thumbnailUrl" TEXT NOT NULL,
--rollback     "width" INTEGER NOT NULL,
--rollback     "height" INTEGER NOT NULL,
--rollback     "blurHash" TEXT NOT NULL,
--rollback     "caption" TEXT,
--rollback     "uploadedBy" TEXT NOT NULL,
--rollback     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
--rollback     CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
--rollback );
--rollback CREATE TABLE "laura"."QuizAnswer" (
--rollback     "id" TEXT NOT NULL,
--rollback     "questionId" TEXT NOT NULL,
--rollback     "text" TEXT NOT NULL,
--rollback     "isCorrect" BOOLEAN NOT NULL DEFAULT false,
--rollback     "sortOrder" INTEGER NOT NULL,
--rollback     "imageBlurHash" TEXT,
--rollback     "imageThumbnailUrl" TEXT,
--rollback     "imageUrl" TEXT,
--rollback     CONSTRAINT "QuizAnswer_pkey" PRIMARY KEY ("id")
--rollback );
--rollback CREATE TABLE "laura"."QuizQuestion" (
--rollback     "id" TEXT NOT NULL,
--rollback     "text" TEXT NOT NULL,
--rollback     "createdBy" TEXT NOT NULL,
--rollback     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
--rollback     "imageBlurHash" TEXT,
--rollback     "imageThumbnailUrl" TEXT,
--rollback     "imageUrl" TEXT,
--rollback     CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
--rollback );
--rollback CREATE UNIQUE INDEX "Favorite_photoId_key" ON "laura"."Favorite"("photoId" ASC);
--rollback CREATE INDEX "Photo_createdAt_idx" ON "laura"."Photo"("createdAt" ASC);
--rollback CREATE INDEX "Photo_uploadedBy_idx" ON "laura"."Photo"("uploadedBy" ASC);
--rollback CREATE INDEX "QuizQuestion_createdBy_idx" ON "laura"."QuizQuestion"("createdBy" ASC);
--rollback ALTER TABLE "laura"."Favorite" ADD CONSTRAINT "Favorite_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "laura"."Photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
--rollback ALTER TABLE "laura"."Photo" ADD CONSTRAINT "Photo_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "auth"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
--rollback ALTER TABLE "laura"."QuizAnswer" ADD CONSTRAINT "QuizAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "laura"."QuizQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
--rollback ALTER TABLE "laura"."QuizQuestion" ADD CONSTRAINT "QuizQuestion_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "auth"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
