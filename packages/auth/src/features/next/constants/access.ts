import { z } from "zod";

/**
 * The paths every App serves its home and Sign in at, after the locale
 * (`/it` + path): home is the locale's root, so it adds nothing.
 */
export const APP_PATH = {
  HOME: "",
  SIGN_IN: "/sign-in",
} as const;

export const appPathSchema = z.enum(APP_PATH);
export type AppPath = z.infer<typeof appPathSchema>;
