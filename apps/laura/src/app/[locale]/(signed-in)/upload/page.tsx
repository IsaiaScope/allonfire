import { requireAppSession } from "@allonfire/auth/features/next/utils/session";
import { Role } from "@allonfire/database/enums";
import { AOFSectionPage } from "@allonfire/ui/features/navigation/components/aof-section-page";
import { AOFFreshOnReturn } from "@allonfire/ui/features/query/components/aof-fresh-on-return";
import { Suspense } from "react";
import { pageMetadata } from "@/features/metadata/utils/page-information";
import { SECTION } from "@/features/navigation/constants/sections";
import { signedInPage } from "@/features/navigation/utils/signed-in-page";
import { Upload } from "@/features/upload/components/upload";
import { UploadSkeleton } from "@/features/upload/components/upload-skeleton";

/** Its own title and link preview. */
export const generateMetadata = () =>
  pageMetadata(SECTION.UPLOAD.path, "Upload.page");

/**
 * The form. Upload is above the App's floor: a User is sent Home by the proxy
 * first and by this check again (the page check's own cached read), and never
 * sees the sidebar's row. It opens empty on every visit: nothing picked or
 * typed is kept in the page Next hides on leaving.
 */
const UploadForm = async () => {
  await requireAppSession({ minRole: Role.ADMIN });
  return (
    <AOFSectionPage width="form">
      <AOFFreshOnReturn>
        <Upload />
      </AOFFreshOnReturn>
    </AOFSectionPage>
  );
};

/** Uploading photos: the form behind its own boundary for the Session. */
const UploadPage = () => (
  <Suspense
    fallback={
      <AOFSectionPage width="form">
        <UploadSkeleton />
      </AOFSectionPage>
    }
  >
    <UploadForm />
  </Suspense>
);

export default signedInPage(UploadPage, { minRole: Role.ADMIN });
