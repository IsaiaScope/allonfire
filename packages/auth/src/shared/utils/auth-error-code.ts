import { z } from "zod";
import { AUTH } from "../constants/auth";

/**
 * The Auth module's own error codes (`AUTH.ERROR_CODE`).
 * @internal
 */
export const authErrorCodeSchema = z.enum(AUTH.ERROR_CODE);
