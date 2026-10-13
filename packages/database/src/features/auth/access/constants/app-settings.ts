import type { z } from "zod";
import { type App, Role } from "../../../../../generated/prisma/enums";
import { roleSchema } from "./schemas";

/** A Role a stranger can be given by Registration: never Admin. */
export const registrationRoleSchema = roleSchema.exclude([Role.ADMIN]);
export type RegistrationRole = z.infer<typeof registrationRoleSchema>;

/** What an App declares about itself (ADR 0019); more fields can follow. */
export type AppSettings = {
  /** The lowest Role this App lets in. */
  minRole: Role;
  /** The Role a visitor registering here gets; null: Registration is closed. */
  registration: RegistrationRole | null;
};

export type AppSettingsTable = Readonly<Record<App, AppSettings>>;
