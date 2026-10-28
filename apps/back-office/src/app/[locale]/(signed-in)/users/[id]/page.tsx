import { AOFEmpty } from "@allonfire/ui/components/aof-empty";
import { IconUser } from "@tabler/icons-react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { pageOpenGraph } from "@/features/metadata/utils/page-open-graph";
import { SectionPage } from "@/features/navigation/components/section-page";
import { signedInPage } from "@/features/navigation/utils/signed-in-page";
import { userHref } from "@/features/users/utils/user-href";

type UserPageProps = { params: Promise<{ id: string }> };

/**
 * Its own title and link preview, at this User's address. The id is a
 * route param, known only at request time: the page's Session check already
 * waits for the request, so Next streams this with it.
 */
export const generateMetadata = async ({
  params,
}: UserPageProps): Promise<Metadata> => {
  const [{ id }, t, locale] = await Promise.all([
    params,
    getTranslations("Users.detail"),
    getLocale(),
  ]);
  return {
    openGraph: pageOpenGraph(userHref(id), locale),
    title: t("page"),
  };
};

/** One User's page; its content arrives in a later plan. */
const UserPage = () => {
  const t = useTranslations("Users.detail");
  return (
    <SectionPage>
      <AOFEmpty
        description={t("description")}
        icon={<IconUser />}
        title={t("title")}
      />
    </SectionPage>
  );
};

export default signedInPage(UserPage);
