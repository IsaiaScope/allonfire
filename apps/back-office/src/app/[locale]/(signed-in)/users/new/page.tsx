import { AOFFreshOnReturn } from "@allonfire/ui/components/aof-fresh-on-return";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { pageOpenGraph } from "@/features/metadata/utils/page-open-graph";
import { SectionPage } from "@/features/navigation/components/section-page";
import { signedInPage } from "@/features/navigation/utils/signed-in-page";
import { AddUser } from "@/features/users/components/add-user";
import { newUserHref } from "@/features/users/utils/user-href";

/** Its own title and link preview, not the Users list's. */
export const generateMetadata = async (): Promise<Metadata> => {
  const [t, locale] = await Promise.all([
    getTranslations("Users.add"),
    getLocale(),
  ]);
  return {
    openGraph: pageOpenGraph(newUserHref(), locale),
    title: t("title"),
  };
};

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
