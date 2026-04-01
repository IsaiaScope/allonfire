"use client";

import { Button } from "@allonfire/ui/components/button";
import { Wrapper } from "@allonfire/ui/components/wrapper";
import { Flame, RefreshCw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Wrapper
      className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-linear-to-br from-background via-background to-destructive/5 px-4 py-12"
      tag="main"
    >
      {/* Ambient glow blobs */}
      <div className="pointer-events-none absolute top-1/4 right-1/3 size-96 rounded-full bg-destructive/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-1/3 left-1/4 size-80 rounded-full bg-[#FF8811]/10 blur-3xl" />

      {/* Logo */}
      <Image
        alt="AllOnFire Social"
        className="mb-8 w-full max-w-56"
        height={220}
        priority
        src="/allonfire-social-horizontal.svg"
        width={740}
      />

      {/* Gradient border card */}
      <div className="w-full max-w-md rounded-2xl bg-linear-to-br from-[#E03C00] via-[#FF8811] to-[#8B1A6B] p-px">
        <div className="flex flex-col items-center gap-6 rounded-2xl bg-card px-6 py-10 text-center sm:px-10">
          {/* Icon with pulse ring */}
          <div className="relative rounded-full bg-destructive/10 p-4">
            <div className="absolute inset-0 animate-pulse rounded-full ring-1 ring-destructive/20" />
            <Flame className="size-16 text-destructive" />
          </div>

          {/* Copy */}
          <div className="space-y-2">
            <h1 className="font-bold text-3xl tracking-tight">
              Something Went Wrong
            </h1>
            <p className="text-muted-foreground">
              An unexpected error occurred. Our team has been notified.
            </p>
            {error.digest && (
              <p className="font-mono text-muted-foreground text-xs">
                Error ID: {error.digest}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              className="shadow-md transition-all duration-200 hover:shadow-lg hover:brightness-110 active:scale-[0.98]"
              onClick={reset}
              size="lg"
            >
              <RefreshCw className="size-4" />
              Try Again
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link href="/">Back to Dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
    </Wrapper>
  );
}
