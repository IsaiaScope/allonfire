import { Button } from "@allonfire/ui/components/button";
import { Wrapper } from "@allonfire/ui/components/wrapper";
import { ArrowLeft, ShieldX } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function Forbidden() {
  return (
    <Wrapper
      className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-linear-to-br from-background via-background to-[#8B1A6B]/5 px-4 py-12"
      tag="main"
    >
      {/* Ambient glow blobs — purple-tinted */}
      <div className="pointer-events-none absolute top-1/4 right-1/4 size-96 rounded-full bg-[#8B1A6B]/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-1/3 left-1/3 size-80 rounded-full bg-[#C435A8]/10 blur-3xl" />

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
      <div className="w-full max-w-md rounded-2xl bg-linear-to-br from-[#8B1A6B] via-[#A8288A] to-[#C435A8] p-px">
        <div className="flex flex-col items-center gap-6 rounded-2xl bg-card px-6 py-10 text-center sm:px-10">
          {/* Icon */}
          <div className="rounded-full bg-destructive/10 p-4 ring-1 ring-destructive/20">
            <ShieldX className="size-16 text-destructive" />
          </div>

          {/* Copy */}
          <div className="space-y-2">
            <h1 className="font-bold text-3xl tracking-tight">
              Access Forbidden
            </h1>
            <p className="text-muted-foreground">
              You don&apos;t have permission to access this resource.
            </p>
          </div>

          {/* Actions */}
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
        </div>
      </div>
    </Wrapper>
  );
}
