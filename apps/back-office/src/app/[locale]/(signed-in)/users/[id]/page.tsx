import { requireAppSession } from "@allonfire/auth/features/next/utils/session";
import { readSessionCookie } from "@allonfire/auth/features/next/utils/session-cookie";
import { App } from "@allonfire/database/enums";
import { AOFFreshOnReturn } from "@allonfire/ui/components/aof-fresh-on-return";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { pageMetadata } from "@/features/metadata/utils/page-metadata";
import { SectionLoading } from "@/features/navigation/components/section-loading";
import { SectionPage } from "@/features/navigation/components/section-page";
import { signedInPage } from "@/features/navigation/utils/signed-in-page";
import { EditUser } from "@/features/users/components/edit-user";
import { readUser } from "@/features/users/utils/read-user";
import { userHref } from "@/features/users/utils/user-href";

type UserPageProps = { params: Promise<{ id: string }> };

/**
 * Its own title and link preview, at this User's address. The id is a
 * route param, known only at request time: the page's Session check already
 * waits for the request, so Next streams this with it.
 */
export const generateMetadata = async ({ params }: UserPageProps) =>
  pageMetadata(userHref((await params).id), "Users.detail.page");

/**
 * The User, read afresh on the server through `readUser`, and the form on
 * them; an unknown id is the 404. The Session is the page check's own read:
 * whose page it is, so their own Back Office Role stays locked.
 */
const UserForm = async ({ params }: UserPageProps) => {
  const [{ id }, sessionCookie, session] = await Promise.all([
    params,
    readSessionCookie(),
    requireAppSession(),
  ]);
  const user = await readUser(sessionCookie, id);
  if (!user) {
    notFound();
  }
  return (
    <SectionPage width="form">
      {/* Opens fresh on every visit: no typed password kept in the page
          Next hides on leaving. */}
      <AOFFreshOnReturn>
        <EditUser
          manageApp={App.BACK_OFFICE}
          selfId={session.user.id}
          user={user}
        />
      </AOFFreshOnReturn>
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
