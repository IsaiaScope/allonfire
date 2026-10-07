import { z } from "zod";
import { AllowedApp, Role } from "../../../../../generated/prisma/enums";

/** Every Role, from the Prisma enum; the one schema every package parses with. */
export const roleSchema = z.enum(Role);

/** Every Allowed apps value, `ALL` included. */
export const allowedAppSchema = z.enum(AllowedApp);

/** Every App a User can enter: each Allowed apps value but `ALL`. */
export const appSchema = allowedAppSchema.exclude([AllowedApp.ALL]);
export type App = z.infer<typeof appSchema>;
