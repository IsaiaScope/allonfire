"use client";

import { Button } from "@allonfire/ui/components/button";
import { Wrapper } from "@allonfire/ui/components/wrapper";
import { ArrowRight, Lock } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function Unauthorized() {
  const t = useTranslations("Unauthorized");

  return (
    <Wrapper
      className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-linear-to-br from-background via-background to-primary/5 px-4 py-12"
      tag="main"
    >
      <div className="pointer-events-none absolute top-1/4 right-1/3 size-96 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-1/4 left-1/4 size-80 rounded-full bg-[#8B5E3C]/10 blur-3xl" />

      <Image
        alt="Laura"
        className="mb-8 w-full max-w-56"
        height={220}
        priority
        src="/allonfire-laura-horizontal.svg"
        width={740}
      />

      <div className="w-full max-w-md rounded-2xl bg-linear-to-br from-primary via-[#d4a04a] to-[#8B5E3C] p-px">
        <div className="flex flex-col items-center gap-6 rounded-2xl bg-card px-6 py-10 text-center sm:px-10">
          <div className="rounded-full bg-primary/10 p-4 ring-1 ring-primary/20">
            <Lock className="size-16 text-primary" />
          </div>

          <div className="space-y-2">
            <h1 className="font-bold text-3xl tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground">{t("description")}</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              asChild
              className="shadow-md transition-all duration-200 hover:shadow-lg hover:brightness-110 active:scale-[0.98]"
              size="lg"
            >
              <Link href="/login">
                {t("signIn")}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link href="/">{t("goHome")}</Link>
            </Button>
          </div>
        </div>
      </div>
    </Wrapper>
  );
}
