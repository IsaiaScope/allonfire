"use client";

import { Button } from "@allonfire/ui/components/button";
import { Card, CardContent } from "@allonfire/ui/components/card";
import { Input } from "@allonfire/ui/components/input";
import { Label } from "@allonfire/ui/components/label";
import { Wrapper } from "@allonfire/ui/components/wrapper";
import { ArrowRight, Eye, EyeOff, Loader2, Sparkles } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { authClient } from "../client";

type LoginFields = {
  email: string;
  password: string;
};

type LoginFormLabels = {
  emailLabel?: string;
  passwordLabel?: string;
  signIn?: string;
  signingIn?: string;
  welcome?: string;
  emailRequired?: string;
  passwordRequired?: string;
  loginFailed?: string;
  accessDenied?: string;
  showPassword?: string;
  hidePassword?: string;
};

type LoginFormProps = {
  appName: string;
  checkAccess: (appName: string) => Promise<boolean>;
  logoSrc: string;
  logoAlt: string;
  subtitle: string;
  emailPlaceholder?: string;
  successIcon?: React.ReactNode;
  topRightSlot?: React.ReactNode;
  labels?: LoginFormLabels;
};

export function LoginForm({
  appName,
  checkAccess,
  logoSrc,
  logoAlt,
  subtitle,
  emailPlaceholder = "you@example.com",
  successIcon = <Sparkles className="size-5 animate-pulse" />,
  topRightSlot,
  labels,
}: LoginFormProps) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();
  const accessDenied = searchParams.get("error") === "access-denied";

  useEffect(() => {
    if (session) {
      router.replace("/");
    }
  }, [session, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFields>();

  function buttonContent() {
    if (success) {
      return (
        <>
          {successIcon}
          {labels?.welcome ?? "Welcome"}
        </>
      );
    }
    if (pending) {
      return (
        <>
          <Loader2 className="size-5 animate-spin" />
          {labels?.signingIn ?? "Signing in..."}
        </>
      );
    }
    return (
      <>
        {labels?.signIn ?? "Sign in"}
        <ArrowRight className="size-5 transition-transform duration-200 group-hover:translate-x-1" />
      </>
    );
  }

  function onSubmit(data: LoginFields) {
    setServerError("");

    startTransition(async () => {
      const result = await authClient.signIn.email({
        email: data.email,
        password: data.password,
      });

      if (result.error) {
        setServerError(
          result.error.message ?? labels?.loginFailed ?? "Login failed"
        );
        return;
      }

      const hasAccess = await checkAccess(appName);
      if (!hasAccess) {
        await authClient.signOut();
        setServerError(
          labels?.accessDenied ??
            "You don't have access to this application. Contact an administrator."
        );
        return;
      }

      setSuccess(true);
      await new Promise((resolve) => setTimeout(resolve, 600));
      router.push("/");
    });
  }

  return (
    <Wrapper
      className="flex flex-1 flex-col items-center justify-center bg-linear-to-br from-background via-background to-primary/5 px-4 py-8 sm:px-6 sm:py-12"
      tag="main"
    >
      <Card className="relative w-full max-w-104 shadow-lg">
        {topRightSlot && (
          <div className="absolute top-2.5 right-2.5 z-10">{topRightSlot}</div>
        )}
        <div className="flex flex-col items-center gap-3 px-6 pt-4 pb-2">
          <Image
            alt={logoAlt}
            className="w-full max-w-64"
            height={220}
            priority
            src={logoSrc}
            width={740}
          />
          <p className="text-center text-base text-muted-foreground">
            {subtitle}
          </p>
        </div>
        <CardContent className="pb-2">
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label className="text-base" htmlFor="email">
                {labels?.emailLabel ?? "Email"}
              </Label>
              <Input
                autoComplete="username"
                className="text-base"
                id="email"
                placeholder={emailPlaceholder}
                type="email"
                {...register("email", {
                  required: labels?.emailRequired ?? "Email is required",
                })}
              />
              {errors.email && (
                <p className="text-base text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Label className="text-base" htmlFor="password">
                {labels?.passwordLabel ?? "Password"}
              </Label>
              <div className="relative">
                <Input
                  autoComplete="current-password"
                  className="pr-10 text-base"
                  id="password"
                  type={showPassword ? "text" : "password"}
                  {...register("password", {
                    required:
                      labels?.passwordRequired ?? "Password is required",
                  })}
                />
                <button
                  aria-label={
                    showPassword
                      ? (labels?.hidePassword ?? "Hide password")
                      : (labels?.showPassword ?? "Show password")
                  }
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((prev) => !prev)}
                  type="button"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-base text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button
              className="group my-4 w-full py-2 text-base shadow-md transition-all duration-200 hover:shadow-lg hover:brightness-110 active:scale-[0.98]"
              disabled={pending}
              size="lg"
              type="submit"
              variant={success ? "secondary" : "default"}
            >
              {buttonContent()}
            </Button>

            {serverError && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-base text-destructive">
                {serverError}
              </p>
            )}
          </form>
          {accessDenied && !serverError && (
            <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-base text-destructive">
              {labels?.accessDenied ??
                "You don't have access to this application. Contact an administrator."}
            </p>
          )}
        </CardContent>
      </Card>
    </Wrapper>
  );
}
