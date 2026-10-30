import { z } from "zod";
import { AUTH } from "../../../shared/constants/auth";

export const appPathSchema = z.enum(AUTH.PAGE);
export type AppPath = z.infer<typeof appPathSchema>;
