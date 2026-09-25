import { getTranslations } from "next-intl/server";
import { Link } from "@/features/i18n/navigation";

const NotFound = async () => {
  const t = await getTranslations("NotFound");
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8">
      <h1 className="font-semibold text-2xl">{t("title")}</h1>
      <Link className="underline" href="/">
        {t("back")}
      </Link>
    </main>
  );
};

export default NotFound;
