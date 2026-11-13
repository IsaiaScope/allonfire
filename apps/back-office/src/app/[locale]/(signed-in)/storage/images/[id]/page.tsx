import { requireAppSession } from "@allonfire/auth/features/next/utils/session";
import { AOFHydratedBoundary } from "@allonfire/core/features/next/query/components/aof-hydrated-boundary";
import { AOFFreshOnReturn } from "@allonfire/ui/features/query/components/aof-fresh-on-return";
import { Suspense } from "react";
import { EditImageSkeleton } from "@/features/images/components/edit-image-skeleton";
import { ImageEditor } from "@/features/images/components/image-editor";
import { administeredApps } from "@/features/images/utils/administered-apps";
import { imageHref } from "@/features/images/utils/image-href";
import { imageHydration } from "@/features/images/utils/images-hydration";
import { pageMetadata } from "@/features/metadata/utils/page-metadata";
import { SectionPage } from "@/features/navigation/components/section-page";
import { signedInPage } from "@/features/navigation/utils/signed-in-page";

type ImagePageProps = { params: Promise<{ id: string }> };

/**
 * Its own title and link preview, at this Image's address. The id is a route
 * param, known only at request time: the page's Session check already waits
 * for the request, so Next streams this with it.
 */
export const generateMetadata = async ({ params }: ImagePageProps) =>
  pageMetadata(imageHref((await params).id), "Images.edit.page");

/**
 * The Image, read through `imageHydration` (kept in the visitor's browser, so
 * a link prefetches it; the save is version-checked) and handed to the form
 * already filled: it reads the query back under the same key. An unknown or
 * hidden id is the 404, drawn by the view. The Apps to choose among are the
 * ones the visitor administers and the ones the Image is in already.
 */
const ImageForm = async ({ params }: ImagePageProps) => {
  const { id } = await params;
  const session = await requireAppSession();
  const hydrate = () => imageHydration(id);
  return (
    <SectionPage width="form">
      <AOFHydratedBoundary hydration={hydrate}>
        {/* Opens fresh on every visit: nothing typed is kept in the page Next hides on leaving. */}
        <AOFFreshOnReturn>
          <ImageEditor administered={administeredApps(session.user)} id={id} />
        </AOFFreshOnReturn>
      </AOFHydratedBoundary>
    </SectionPage>
  );
};

/** One Image's page, opening straight on the edit form, behind its own boundary for the id and the Image. */
const ImagePage = ({ params }: ImagePageProps) => (
  <Suspense
    fallback={
      <SectionPage width="form">
        <EditImageSkeleton />
      </SectionPage>
    }
  >
    <ImageForm params={params} />
  </Suspense>
);

export default signedInPage(ImagePage);
