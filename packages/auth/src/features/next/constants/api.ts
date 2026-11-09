import { z } from "zod";
import { AUTH } from "../../../shared/constants/auth";

const signInErrorSchema = z.enum(AUTH.SIGN_IN_ERROR);
export type SignInError = z.infer<typeof signInErrorSchema>;

/**
 * What the `signIn` action hands back to the form (`useActionState`): why it
 * failed. Nothing comes back on success: the action redirects home.
 */
export type SignInState = { error?: SignInError };

const forgotErrorSchema = z.enum(AUTH.FORGOT_ERROR);
export type ForgotError = z.infer<typeof forgotErrorSchema>;

/**
 * What asking for a reset link hands back: sent (said the same whether the
 * address has an account), or why it could not be asked.
 */
export type ForgotState = { error?: ForgotError; sent?: true };

const resetErrorSchema = z.enum(AUTH.RESET_ERROR);
export type ResetError = z.infer<typeof resetErrorSchema>;

/** Why setting the new password failed; nothing on success: the action goes to Sign in. */
export type ResetState = { error?: ResetError };
