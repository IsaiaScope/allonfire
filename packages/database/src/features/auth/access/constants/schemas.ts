import { z } from "zod";
import { App, Role } from "../../../../../generated/prisma/enums";

export type { App } from "../../../../../generated/prisma/enums";

/** Every Role, from the Prisma enum; the one schema every package parses with. */
export const roleSchema = z.enum(Role);

/** Every App, from the Prisma enum, spelled as its keys (`BACK_OFFICE`). */
export const appSchema = z.enum(App);
