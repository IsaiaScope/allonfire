--liquibase formatted sql logicalFilePath:changesets/0008-laura-viewers-to-users.sql

--changeset isaia:0008-laura-viewers-to-users
--comment: ADR 0032: Laura admits no Viewer (its floor is User). Every Laura Viewer Membership becomes a User one; the Viewer Role and every other App's Memberships stay. A rollback cannot know which Memberships were Viewers, so it does nothing.
UPDATE "auth"."Membership" SET "role" = 'USER' WHERE "app" = 'laura' AND "role" = 'VIEWER';
--rollback empty
