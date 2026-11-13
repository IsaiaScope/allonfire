import { requireAppSession } from "@allonfire/auth/features/next/utils/session";
import { AOFHydratedBoundary } from "@allonfire/core/features/next/query/components/aof-hydrated-boundary";
import { App } from "@allonfire/database/enums";
import { AOFFreshOnReturn } from "@allonfire/ui/features/query/components/aof-fresh-on-return";
import { Suspense } from "react";
import { pageMetadata } from "@/features/metadata/utils/page-metadata";
import { SectionLoading } from "@/features/navigation/components/section-loading";
import { SectionPage } from "@/features/navigation/components/section-page";
import { signedInPage } from "@/features/navigation/utils/signed-in-page";
import { UserEditor } from "@/features/users/components/user-editor";
import { userHref } from "@/features/users/utils/user-href";
import { userHydration } from "@/features/users/utils/users-hydration";

type UserPageProps = { params: Promise<{ id: string }> };

/**
 * Its own title and link preview, at this User's address. The id is a
 * route param, known only at request time: the page's Session check already
 * waits for the request, so Next streams this with it.
 */
export const generateMetadata = async ({ params }: UserPageProps) =>
  pageMetadata(userHref((await params).id), "Users.detail.page");

/**
 * The User, read through `userHydration` (kept in the visitor's browser, so a
 * link prefetches it; the save is version-checked) and handed to the form
 * already filled: it reads the query back under the same key. An unknown id
 * is the 404, drawn by the view. The Session is the page check's own read:
 * whose page it is, so their own Back Office Role stays locked.
 */
const UserForm = async ({ params }: UserPageProps) => {
  const { id } = await params;
  const session = await requireAppSession();
  const hydrate = () => userHydration(id);
  return (
    <SectionPage width="form">
      <AOFHydratedBoundary hydration={hydrate}>
        {/* Opens fresh on every visit: no typed password kept in the page
            Next hides on leaving. */}
        <AOFFreshOnReturn>
          <UserEditor
            id={id}
            manageApp={App.BACK_OFFICE}
            selfId={session.user.id}
          />
        </AOFFreshOnReturn>
      </AOFHydratedBoundary>
    </SectionPage>
  );
};

/**
 * One User's page, opening straight on the edit form. The id and the User
 * wait for the request, behind the page's own boundary.
 */
const UserPage = ({ params }: UserPageProps) => (
  <Suspense fallback={<SectionLoading />}>
    <UserForm params={params} />
  </Suspense>
);

export default signedInPage(UserPage);
