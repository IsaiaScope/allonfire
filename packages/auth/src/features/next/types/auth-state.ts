import type {
  ForgotError,
  ResetError,
  SignInError,
} from "../../../shared/constants/auth-schema";

/**
 * What the `signIn` action hands back to the form (`useActionState`): why it
 * failed. Nothing comes back on success: the action redirects home.
 */
export type SignInState = { error?: SignInError };

/**
 * What asking for a reset link hands back: sent (said the same whether the
 * address has an account), or why it could not be asked.
 */
export type ForgotState = { error?: ForgotError; sent?: true };

/** Why setting the new password failed; nothing on success: the action goes to Sign in. */
export type ResetState = { error?: ResetError };
