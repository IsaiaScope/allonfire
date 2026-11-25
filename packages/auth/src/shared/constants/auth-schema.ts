import { z } from "zod";
import { AUTH } from "./auth";

const signInErrorSchema = z.enum(AUTH.ERROR.SIGN_IN);
export type SignInError = z.infer<typeof signInErrorSchema>;

const forgotErrorSchema = z.enum(AUTH.ERROR.FORGOT);
export type ForgotError = z.infer<typeof forgotErrorSchema>;

const resetErrorSchema = z.enum(AUTH.ERROR.RESET);
export type ResetError = z.infer<typeof resetErrorSchema>;

const appPathSchema = z.enum(AUTH.PAGE);
export type AppPath = z.infer<typeof appPathSchema>;
