import { AOFSectionPage } from "@allonfire/ui/features/navigation/components/aof-section-page";
import { AOFFreshOnReturn } from "@allonfire/ui/features/query/components/aof-fresh-on-return";
import { signedInPage } from "@/features/navigation/utils/signed-in-page";
import { AddUser } from "@/features/users/components/add-user";
import { newUserHref } from "@/features/users/utils/user-href";
import { pageMetadata } from "@/shared/constants/page-information";

/** Its own title and link preview, not the Users list's. */
export const generateMetadata = () =>
  pageMetadata(newUserHref(), "Users.add.title");

/**
 * Adding a User: the form, under the Users Section, in the static shell.
 * It opens empty on every visit: nothing typed, and no password, is kept in
 * the page Next hides on leaving.
 */
const AddUserPage = () => (
  <AOFSectionPage width="form">
    <AOFFreshOnReturn>
      <AddUser />
    </AOFFreshOnReturn>
  </AOFSectionPage>
);

export default signedInPage(AddUserPage);
