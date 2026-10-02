import { signOut } from "@allonfire/auth/features/next/actions/sign-out";
import { requireAppSession } from "@allonfire/auth/features/next/utils/require-app-session";
import { AOFButton } from "@allonfire/ui/components/aof-button";
import { AOFPage } from "@allonfire/ui/components/aof-page";
import { getLocale, getTranslations } from "next-intl/server";

// Signed-in only: the page reads the Session cookie on every request, so
// there is nothing to prerender.
export const instant = false;

const HomePage = async () => {
  await requireAppSession();
  const t = await getTranslations("Home");
  // Server Actions cannot read the route's locale yet; the form binds it.
  const signOutHere = signOut.bind(null, await getLocale());
  return (
    <AOFPage layout="centered">
      <h1 className="font-semibold text-2xl">{t("title")}</h1>
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
