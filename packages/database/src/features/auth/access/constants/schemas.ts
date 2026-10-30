import { z } from "zod";
import { App, ImageAccess, Role } from "../../../../../generated/prisma/enums";

export type { App } from "../../../../../generated/prisma/enums";

/** Every Role, from the Prisma enum; the one schema every package parses with. */
export const roleSchema = z.enum(Role);

/** Every App, from the Prisma enum, spelled as its keys (`BACK_OFFICE`). */
export const appSchema = z.enum(App);

/** Public or private, from the Prisma enum: an Image's access (ADR 0027). */
export const imageAccessSchema = z.enum(ImageAccess);
