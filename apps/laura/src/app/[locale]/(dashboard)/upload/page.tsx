import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageContainer } from "@/features/layout/components/page-container";
import { UploadClient } from "@/features/upload/components/upload-client";

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

  return (
    <PageContainer>
      <div className="space-y-6">
        <div>
          <h1 className="font-bold text-2xl tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
        </div>
        <UploadClient />
      </div>
    </PageContainer>
  );
}
