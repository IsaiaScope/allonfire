import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPhotosAction } from "@/features/gallery/actions/gallery";
import { GalleryClient } from "@/features/gallery/components/gallery-client";
import { getAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Gallery" });
  const seo = await getTranslations({ locale, namespace: "SEO" });
  return {
    title: t("title"),
    description: seo("galleryDescription"),
    alternates: getAlternates(locale, "/"),
  };
}

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const initialData = await getPhotosAction();

  return <GalleryClient initialData={initialData} />;
}
