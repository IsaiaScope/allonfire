import { AOFHydratedBoundary } from "@allonfire/core/features/next/query/components/aof-hydrated-boundary";
import { useTranslations } from "next-intl";
import type { SearchParams } from "nuqs/server";
import { Suspense } from "react";
import { ImagesListSkeleton } from "@/features/images/components/images-list-skeleton";
import { ImagesTable } from "@/features/images/components/images-table";
import { loadImagesParams } from "@/features/images/constants/images-params";
import { imagesHydration } from "@/features/images/utils/images-hydration";
import { pageMetadata } from "@/features/metadata/utils/page-metadata";
import { SectionPage } from "@/features/navigation/components/section-page";
import { signedInPage } from "@/features/navigation/utils/signed-in-page";
import { BACK_OFFICE } from "@/shared/constants/back-office";

export const generateMetadata = () =>
  pageMetadata(BACK_OFFICE.PAGE.STORAGE_IMAGES, "Navigation.images");

type ImagesPageProps = { searchParams: Promise<SearchParams> };

/**
 * The list's rows, read from the address (cleaned, never refused) through
 * `imagesHydration`, kept in the visitor's browser until a change to Images,
 * so a link prefetches them, and handed to the table already filled: it
 * reads the query back under the same key. A query the API refused is left
 * to the table, which asks again and shows the error.
 */
const ImagesList = async ({ searchParams }: ImagesPageProps) => {
  const params = await loadImagesParams(searchParams);
  const hydrate = () => imagesHydration(params);
  return (
    <AOFHydratedBoundary hydration={hydrate}>
      <ImagesTable />
    </AOFHydratedBoundary>
  );
};

/**
 * The Images list: the page itself is in the static shell, so a visit paints
 * at once; only the rows, which hang on the address and the API, wait behind
 * the list's own skeleton (Next's instant navigation: the boundary at the
 * data it guards, never the page's loading screen).
 */
const ImagesPage = ({ searchParams }: ImagesPageProps) => {
  const t = useTranslations("Navigation");
  return (
    <SectionPage className="gap-6">
      {/* The header's breadcrumb already names the page on screen; the page
          keeps its h1 for screen readers. */}
      <h1 className="sr-only">{t("images")}</h1>
      <Suspense fallback={<ImagesListSkeleton />}>
        <ImagesList searchParams={searchParams} />
      </Suspense>
    </SectionPage>
  );
};

export default signedInPage(ImagesPage);
