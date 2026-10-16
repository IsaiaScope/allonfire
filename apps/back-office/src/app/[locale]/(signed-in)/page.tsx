import { signOut } from "@allonfire/auth/features/next/actions/sign-out";
import { requireAppSession } from "@allonfire/auth/features/next/utils/session";
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { AOFButton } from "@allonfire/ui/components/aof-button";
import { AOFPage } from "@allonfire/ui/components/aof-page";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { pageOpenGraph } from "@/features/metadata/utils/page-open-graph";
import { BACK_OFFICE } from "@/shared/constants/back-office";

// The layout's default title; only the address differs.
export const generateMetadata = async (): Promise<Metadata> => ({
  openGraph: pageOpenGraph(AUTH.PAGE.HOME, await getLocale()),
});

const HomePage = async () => {
  await requireAppSession();
  const [t, locale] = await Promise.all([getTranslations("Home"), getLocale()]);
  // Server Actions cannot read the route's locale yet; the form binds it.
  const signOutHere = signOut.bind(null, locale);
  return (
    <AOFPage layout="centered">
      <h1 className="font-semibold text-2xl">{BACK_OFFICE.NAME}</h1>
      <p className="text-muted-foreground">{t("description")}</p>
      <form action={signOutHere}>
        <AOFButton type="submit" variant="outline">
          {t("signOut")}
        </AOFButton>
      </form>
    </AOFPage>
  );
};

export default HomePage;
