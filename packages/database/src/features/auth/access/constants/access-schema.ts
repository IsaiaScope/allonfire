import type { Indexing } from "@allonfire/core/features/metadata/constants/metadata";
import type { z } from "zod";
import { type App, Role } from "../../../../../generated/prisma/enums";
import { roleSchema } from "./schemas";

/**
 * A Role a stranger can be given by Registration: never Admin.
 * @internal
 */
export const registrationRoleSchema = roleSchema.exclude([Role.ADMIN]);
export type RegistrationRole = z.infer<typeof registrationRoleSchema>;

/** What an App declares about itself (ADR 0019); more fields can follow. */
type AppSettings = {
  /** Whether search engines may list this App's pages (CONTEXT.md, Indexing). */
  indexing: Indexing;
  /** The lowest Role this App lets in. */
  minRole: Role;
  /** The Role a visitor registering here gets; null: Registration is closed. */
  registration: RegistrationRole | null;
  /**
   * How the App is spelled in an address, a path and a folder name: the enum
   * value in lowercase, a hyphen for each underscore (the database stores it
   * so). The one place it is written; everything else reads it.
   */
  slug: string;
};

export type AppSettingsTable = Readonly<Record<App, AppSettings>>;
