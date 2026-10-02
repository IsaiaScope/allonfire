"use client";

import { signIn } from "@allonfire/auth/features/next/actions/sign-in";
import {
  SIGN_IN_ERROR,
  type SignInState,
} from "@allonfire/auth/features/next/constants/api";
import { AOFButton } from "@allonfire/ui/components/aof-button";
import { AOFInput } from "@allonfire/ui/components/aof-input";
import { AOFLabel } from "@allonfire/ui/components/aof-label";
import { cva } from "class-variance-authority";
import { KeyRound, LoaderCircle, Mail, Nfc, TriangleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";

// Each field opens on a pictogram tile, white on black like station signage.
const field = cva("h-12 pl-14 text-base md:text-base");
const fieldIcon = cva(
  "dark pointer-events-none absolute inset-y-1.5 left-1.5 flex w-9 items-center justify-center rounded-sm bg-led-panel text-foreground *:size-5"
);

/**
 * The email and password form, posted to the shared `signIn` server action
 * through `useActionState`, Next's pattern for a form that shows errors: the
 * action and every check run on the server; this client leaf only holds the
 * answer (why it failed) and the pending flag, so the page stays mounted and
 * nothing replays. Works before hydration too, as a plain form post. The
 * server checks the fields (`noValidate`: the browser's own bubbles speak its
 * UI language, not the page's). A success never comes back: the action
 * redirects home.
 */
export const SignInForm = ({
  initialState = {},
}: {
  /** The state to start from, e.g. an error the page already knows. */
  initialState?: SignInState;
}) => {
  const t = useTranslations("SignIn");
  const locale = useLocale();
  const [{ error }, action, pending] = useActionState(
    signIn.bind(null, locale),
    initialState
  );
  // A server-side refusal or outage is not the fields' fault.
  const invalid =
    error === SIGN_IN_ERROR.INVALID || error === SIGN_IN_ERROR.MISSING
      ? true
      : undefined;

  return (
    <form
      action={action}
      aria-label={t("submit")}
      className="flex flex-col gap-5 p-4 lg:p-6"
      noValidate
    >
      {error ? (
        <p
          className="flex items-start gap-3 rounded-md border border-destructive bg-destructive/10 px-3 py-3 text-sm"
          role="alert"
        >
          <TriangleAlert
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-destructive"
          />
          {t(`error.${error}`)}
        </p>
      ) : null}
      <div className="flex flex-col gap-2">
        <AOFLabel className="font-bold" htmlFor="sign-in-email">
          {t("email")}
        </AOFLabel>
        <div className="relative">
          <span aria-hidden className={fieldIcon()}>
            <Mail />
          </span>
          <AOFInput
            aria-invalid={invalid}
            autoComplete="username"
            className={field()}
            id="sign-in-email"
            inputMode="email"
            name="email"
            required
            spellCheck={false}
            type="email"
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <AOFLabel className="font-bold" htmlFor="sign-in-password">
          {t("password")}
        </AOFLabel>
        <div className="relative">
          <span aria-hidden className={fieldIcon()}>
            <KeyRound />
          </span>
          <AOFInput
            aria-invalid={invalid}
            autoComplete="current-password"
            className={field()}
            id="sign-in-password"
            name="password"
            required
            type="password"
          />
        </div>
      </div>
      <AOFButton
        aria-busy={pending || undefined}
        className="mt-1 h-12 w-full gap-2 font-bold text-base"
        disabled={pending}
        type="submit"
      >
        {pending ? (
          <LoaderCircle aria-hidden className="animate-spin" />
        ) : (
          <Nfc aria-hidden />
        )}
        {pending ? t("submitting") : t("submit")}
      </AOFButton>
    </form>
  );
};
