import { z } from "zod";

/** The Sign in form's field messages, translated by the form. */
export type SignInFieldMessages = {
  emailInvalid: string;
  emailRequired: string;
  passwordRequired: string;
};

/** An email the visitor typed: required, then a valid address. */
export const emailField = (messages: {
  emailInvalid: string;
  emailRequired: string;
}) =>
  z
    .string()
    .trim()
    .min(1, messages.emailRequired)
    .pipe(z.email(messages.emailInvalid));

/**
 * The Sign in form's checks in the browser (ADR 0017): the two rules
 * `signInWithEmail` applies on the server, each with its message. The
 * server's copy is the one that counts; this one spares a round trip.
 */
export const signInSchema = (messages: SignInFieldMessages) =>
  z.object({
    email: emailField(messages),
    password: z.string().min(1, messages.passwordRequired),
  });
