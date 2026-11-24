--liquibase formatted sql logicalFilePath:changesets/0009-laura-favorite.sql

--changeset isaia:0009-laura-favorite
--comment: Laura's Favorites. The master list the Admins edit (Favorite), a Profile per Laura Membership (Profile, created on first use, removed with the Membership) and each Profile's copy of the master (ProfileFavorite). Every foreign key cascades, so removing the Image's Laura placement, the Membership or the User removes the dependent rows with no code (ADR 0034).
-- CreateTable
CREATE TABLE "laura"."Favorite" (
    "imageId" TEXT NOT NULL,
    "app" "auth"."App" NOT NULL DEFAULT 'laura',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("imageId")
);

-- CreateTable
CREATE TABLE "laura"."Profile" (
    "userId" TEXT NOT NULL,
    "app" "auth"."App" NOT NULL DEFAULT 'laura',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("userId","app")
);

-- CreateTable
CREATE TABLE "laura"."ProfileFavorite" (
    "userId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "app" "auth"."App" NOT NULL DEFAULT 'laura',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileFavorite_pkey" PRIMARY KEY ("userId","imageId")
);

-- CreateIndex
CREATE INDEX "Favorite_createdAt_imageId_idx" ON "laura"."Favorite"("createdAt", "imageId");

-- CreateIndex
CREATE INDEX "ProfileFavorite_userId_createdAt_imageId_idx" ON "laura"."ProfileFavorite"("userId", "createdAt", "imageId");

-- AddForeignKey
ALTER TABLE "laura"."Favorite" ADD CONSTRAINT "Favorite_imageId_app_fkey" FOREIGN KEY ("imageId", "app") REFERENCES "image"."ImageApp"("imageId", "app") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laura"."Profile" ADD CONSTRAINT "Profile_userId_app_fkey" FOREIGN KEY ("userId", "app") REFERENCES "auth"."Membership"("userId", "app") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laura"."ProfileFavorite" ADD CONSTRAINT "ProfileFavorite_userId_app_fkey" FOREIGN KEY ("userId", "app") REFERENCES "laura"."Profile"("userId", "app") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laura"."ProfileFavorite" ADD CONSTRAINT "ProfileFavorite_imageId_app_fkey" FOREIGN KEY ("imageId", "app") REFERENCES "image"."ImageApp"("imageId", "app") ON DELETE CASCADE ON UPDATE CASCADE;

-- Prisma cannot express a CHECK: the app column exists only to name the keys it references, so it is a constant.
ALTER TABLE "laura"."Favorite" ADD CONSTRAINT "Favorite_app_check" CHECK ("app" = 'laura');
ALTER TABLE "laura"."Profile" ADD CONSTRAINT "Profile_app_check" CHECK ("app" = 'laura');
ALTER TABLE "laura"."ProfileFavorite" ADD CONSTRAINT "ProfileFavorite_app_check" CHECK ("app" = 'laura');
--rollback DROP TABLE "laura"."ProfileFavorite";
--rollback DROP TABLE "laura"."Profile";
--rollback DROP TABLE "laura"."Favorite";
