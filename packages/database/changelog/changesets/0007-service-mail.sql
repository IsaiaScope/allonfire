--liquibase formatted sql logicalFilePath:changesets/0007-service-mail.sql

--changeset isaia:0007-service-mail
--comment: Services by type, each type with its own provider table (MAIL first: MailProvider; usage is read from the provider's own API, so nothing counts it here), and the moment an Admin last required a User to verify. The two providers start disabled with no sender: an Admin fills it in the Back Office, since it belongs to the deployment, not this repository.
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "service";

-- CreateEnum
CREATE TYPE "service"."ServiceType" AS ENUM ('mail');

-- AlterTable
ALTER TABLE "auth"."User" ADD COLUMN     "verificationRequiredAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "service"."Service" (
    "id" TEXT NOT NULL,
    "type" "service"."ServiceType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service"."MailProvider" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "fromAddress" TEXT NOT NULL,
    "dailyLimit" INTEGER NOT NULL,
    "monthlyLimit" INTEGER,
    "lastAcceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailProvider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Service_type_key" ON "service"."Service"("type");

-- CreateIndex
CREATE UNIQUE INDEX "MailProvider_serviceId_slot_key" ON "service"."MailProvider"("serviceId", "slot");

-- AddForeignKey
ALTER TABLE "service"."MailProvider" ADD CONSTRAINT "MailProvider_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "service"."Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Constraints Prisma cannot express; the application checks the same rules.
ALTER TABLE "service"."MailProvider" ADD CONSTRAINT "MailProvider_slot_check" CHECK ("slot" >= 0);
ALTER TABLE "service"."MailProvider" ADD CONSTRAINT "MailProvider_limits_check" CHECK ("dailyLimit" >= 0 AND ("monthlyLimit" IS NULL OR "monthlyLimit" >= 0));
ALTER TABLE "service"."MailProvider" ADD CONSTRAINT "MailProvider_enabled_check" CHECK (NOT "enabled" OR "fromAddress" <> '');

-- The MAIL Service and its providers in slot order, at their free daily allowances.
INSERT INTO "service"."Service" ("id", "type", "updatedAt") VALUES (gen_random_uuid()::text, 'mail', CURRENT_TIMESTAMP);
INSERT INTO "service"."MailProvider" ("id", "serviceId", "slot", "name", "enabled", "fromAddress", "dailyLimit", "monthlyLimit", "updatedAt")
SELECT gen_random_uuid()::text, s."id", p.slot, p.name, false, '', p.daily, p.monthly, CURRENT_TIMESTAMP
FROM "service"."Service" s,
  (VALUES (0, 'Provider 1', 300, NULL::INTEGER), (1, 'Provider 2', 100, 3000)) AS p(slot, name, daily, monthly)
WHERE s."type" = 'mail';
--rollback DROP TABLE "service"."MailProvider";
--rollback DROP TABLE "service"."Service";
--rollback DROP TYPE "service"."ServiceType";
--rollback DROP SCHEMA "service";
--rollback ALTER TABLE "auth"."User" DROP COLUMN "verificationRequiredAt";
