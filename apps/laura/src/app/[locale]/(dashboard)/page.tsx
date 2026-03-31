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

  const initialData = await getPhotosAction();

  return <GalleryClient initialData={initialData} />;
}
