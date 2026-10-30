import { AOFFreshOnReturn } from "@allonfire/ui/components/aof-fresh-on-return";
import { pageMetadata } from "@/features/metadata/utils/page-metadata";
import { SectionPage } from "@/features/navigation/components/section-page";
import { signedInPage } from "@/features/navigation/utils/signed-in-page";
import { AddUser } from "@/features/users/components/add-user";
import { newUserHref } from "@/features/users/utils/user-href";

/** Its own title and link preview, not the Users list's. */
export const generateMetadata = () =>
  pageMetadata(newUserHref(), "Users.add.title");

/**
 * Adding a User: the form, under the Users Section, in the static shell.
 * It opens empty on every visit: nothing typed, and no password, is kept in
 * the page Next hides on leaving.
 */
const AddUserPage = () => (
  <SectionPage width="form">
    <AOFFreshOnReturn>
      <AddUser />
    </AOFFreshOnReturn>
  </SectionPage>
);

export default signedInPage(AddUserPage);
