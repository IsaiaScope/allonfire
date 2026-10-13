import { z } from "zod";
import { AUTH } from "./auth";

export const authErrorCodeSchema = z.enum(AUTH.ERROR_CODE);
export type AuthErrorCode = z.infer<typeof authErrorCodeSchema>;
