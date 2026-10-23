import { AOFFreshOnReturn } from "@allonfire/ui/components/aof-fresh-on-return";
import { SectionPage } from "@/features/navigation/components/section-page";
import { SECTION } from "@/features/navigation/constants/sections";
import { sectionMetadata } from "@/features/navigation/utils/section-metadata";
import { signedInPage } from "@/features/navigation/utils/signed-in-page";
import { AddUser } from "@/features/users/components/add-user";

export const generateMetadata = () => sectionMetadata(SECTION.USERS);

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
