--liquibase formatted sql logicalFilePath:changesets/0001-auth-laura-schemas.sql

--changeset isaia:0001-auth-laura-schemas
--comment: Moves every table into its App schema (ADR 0007). SET SCHEMA renames in the catalogue: rows, indexes, constraints and foreign keys go with the table.
CREATE SCHEMA auth;
CREATE SCHEMA laura;
ALTER TABLE public."User" SET SCHEMA auth;
ALTER TABLE public."Session" SET SCHEMA auth;
ALTER TABLE public."Account" SET SCHEMA auth;
ALTER TABLE public."Verification" SET SCHEMA auth;
ALTER TYPE public."Role" SET SCHEMA auth;
ALTER TABLE public."Photo" SET SCHEMA laura;
ALTER TABLE public."Favorite" SET SCHEMA laura;
ALTER TABLE public."GameScore" SET SCHEMA laura;
ALTER TABLE public."QuizQuestion" SET SCHEMA laura;
ALTER TABLE public."QuizAnswer" SET SCHEMA laura;
ALTER TYPE public."GameType" SET SCHEMA laura;
--rollback ALTER TYPE laura."GameType" SET SCHEMA public;
--rollback ALTER TABLE laura."QuizAnswer" SET SCHEMA public;
--rollback ALTER TABLE laura."QuizQuestion" SET SCHEMA public;
--rollback ALTER TABLE laura."GameScore" SET SCHEMA public;
--rollback ALTER TABLE laura."Favorite" SET SCHEMA public;
--rollback ALTER TABLE laura."Photo" SET SCHEMA public;
--rollback ALTER TYPE auth."Role" SET SCHEMA public;
--rollback ALTER TABLE auth."Verification" SET SCHEMA public;
--rollback ALTER TABLE auth."Account" SET SCHEMA public;
--rollback ALTER TABLE auth."Session" SET SCHEMA public;
--rollback ALTER TABLE auth."User" SET SCHEMA public;
--rollback DROP SCHEMA laura;
--rollback DROP SCHEMA auth;
