import { requireAppSession } from "@allonfire/auth/features/next/utils/session";
import { AOFFreshOnReturn } from "@allonfire/ui/features/query/components/aof-fresh-on-return";
import { Suspense } from "react";
import { AddImage } from "@/features/images/components/add-image";
import { AddImageSkeleton } from "@/features/images/components/add-image-skeleton";
import { administeredApps } from "@/features/images/utils/administered-apps";
import { newImageHref } from "@/features/images/utils/image-href";
import { pageMetadata } from "@/features/metadata/utils/page-metadata";
import { SectionPage } from "@/features/navigation/components/section-page";
import { signedInPage } from "@/features/navigation/utils/signed-in-page";

/** Its own title and link preview, not the Images list's. */
export const generateMetadata = () =>
  pageMetadata(newImageHref(), "Images.add.page");

/**
 * The form, offering only the Apps the visitor administers (their Session,
 * read for the request). It opens empty on every visit: nothing picked or
 * typed is kept in the page Next hides on leaving.
 */
const AddImageForm = async () => {
  const session = await requireAppSession();
  return (
    <SectionPage width="form">
      <AOFFreshOnReturn>
        <AddImage apps={administeredApps(session.user)} />
      </AOFFreshOnReturn>
    </SectionPage>
  );
};

/** Adding Images: the form under the Images page, behind its own boundary for the Session. */
const AddImagePage = () => (
  <Suspense
    fallback={
      <SectionPage width="form">
        <AddImageSkeleton />
      </SectionPage>
    }
  >
    <AddImageForm />
  </Suspense>
);

export default signedInPage(AddImagePage);
