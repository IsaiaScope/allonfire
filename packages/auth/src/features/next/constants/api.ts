import { z } from "zod";
import { AUTH } from "../../../shared/constants/auth";

export const signInErrorSchema = z.enum(AUTH.SIGN_IN_ERROR);
export type SignInError = z.infer<typeof signInErrorSchema>;

/**
 * What the `signIn` action hands back to the form (`useActionState`): why it
 * failed. Nothing comes back on success: the action redirects home.
 */
export type SignInState = { error?: SignInError };
