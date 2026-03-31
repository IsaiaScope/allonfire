import { getTranslations, setRequestLocale } from "next-intl/server";
import { getFavoritesAction } from "@/features/gallery/actions/gallery";
import { FavoritesClient } from "@/features/gallery/components/favorites-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Favorites" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function FavoritesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const initialData = await getFavoritesAction();

  return <FavoritesClient initialData={initialData} />;
}
