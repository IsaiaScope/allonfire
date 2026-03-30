import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPhotosAction } from "@/features/gallery/actions/gallery";
import { GalleryClient } from "@/features/gallery/components/gallery-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Gallery" });
  return { title: t("title") };
}

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Gallery");
  const initialData = await getPhotosAction();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-2xl tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
      </div>
      <GalleryClient initialData={initialData} />
    </div>
  );
}
