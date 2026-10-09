import { AOFPage } from "@allonfire/ui/components/aof-page";
import { getTranslations } from "next-intl/server";
import { Link } from "@/features/i18n/navigation";

const NotFound = async () => {
  const t = await getTranslations("Common.NotFound");
  return (
    <AOFPage layout="centered">
      <h1 className="font-semibold text-2xl">{t("title")}</h1>
      <nav>
        <Link className="underline" href="/">
          {t("back")}
        </Link>
      </nav>
    </AOFPage>
  );
};

export default NotFound;
