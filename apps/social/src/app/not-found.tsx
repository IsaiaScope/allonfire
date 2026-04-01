import { Button } from "@allonfire/ui/components/button";
import { Wrapper } from "@allonfire/ui/components/wrapper";
import { ArrowLeft, FileQuestion } from "lucide-react";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function NotFound() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return (
    <Wrapper
      className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-linear-to-br from-background via-background to-primary/5 px-4 py-12"
      tag="main"
    >
      {/* Ambient glow blobs */}
      <div className="pointer-events-none absolute top-1/4 right-1/4 size-96 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-1/4 left-1/4 size-80 rounded-full bg-[#8B1A6B]/10 blur-3xl" />

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
      <div className="w-full max-w-md rounded-2xl bg-linear-to-br from-primary via-[#FF8811] to-[#8B1A6B] p-px">
        <div className="flex flex-col items-center gap-6 rounded-2xl bg-card px-6 py-10 text-center sm:px-10">
          {/* Icon */}
          <div className="rounded-full bg-primary/10 p-4 ring-1 ring-primary/20">
            <FileQuestion className="size-16 text-primary" />
          </div>

          {/* Copy */}
          <div className="space-y-2">
            <h1 className="font-bold text-3xl tracking-tight">
              Page Not Found
            </h1>
            <p className="text-muted-foreground">
              This page doesn&apos;t exist or has been moved.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              asChild
              className="shadow-md transition-all duration-200 hover:shadow-lg hover:brightness-110 active:scale-[0.98]"
              size="lg"
            >
              <Link href="/">
                <ArrowLeft className="size-4" />
                Back to Dashboard
              </Link>
            </Button>
            {!session && (
              <Button asChild size="lg" variant="ghost">
                <Link href="/login">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </Wrapper>
  );
}
