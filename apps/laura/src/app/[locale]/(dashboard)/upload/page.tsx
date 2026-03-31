import { checkAppAccess } from "@allonfire/auth/guard";
import { Button } from "@allonfire/ui/components/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@allonfire/ui/components/card";
import { Lock } from "lucide-react";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  AnimatedPageWrapper,
  AnimatedSection,
} from "@/components/animated-page";
import { PageContainer } from "@/features/layout/components/page-container";
import { UploadClient } from "@/features/upload/components/upload-client";
import { auth } from "@/lib/auth";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Upload" });
  return { title: t("title") };
}

export default async function UploadPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Upload");
  const { user } = await checkAppAccess(auth, "laura");

  if (user.role === "VIEWER") {
    return (
      <PageContainer>
        <AnimatedPageWrapper>
          <AnimatedSection>
            <Card className="mx-auto max-w-md text-center">
              <CardHeader className="items-center gap-3">
                <Lock className="size-10 text-muted-foreground" />
                <CardTitle>{t("viewerTitle")}</CardTitle>
                <CardDescription>{t("viewerDescription")}</CardDescription>
                <Button asChild className="mt-2" variant="outline">
                  <Link href="/">{t("backToGallery")}</Link>
                </Button>
              </CardHeader>
            </Card>
          </AnimatedSection>
        </AnimatedPageWrapper>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <AnimatedPageWrapper>
        <AnimatedSection>
          <h1 className="font-bold text-2xl tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
        </AnimatedSection>
        <AnimatedSection>
          <UploadClient />
        </AnimatedSection>
      </AnimatedPageWrapper>
    </PageContainer>
  );
}
