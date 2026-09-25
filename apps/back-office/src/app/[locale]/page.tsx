import { AOFButton } from "@allonfire/ui/components/aof-button";
import { getTranslations } from "next-intl/server";

const HomePage = async () => {
  const t = await getTranslations("Home");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8">
      <h1 className="font-semibold text-2xl">{t("title")}</h1>
      <p className="text-muted-foreground">{t("description")}</p>
      <AOFButton>{t("action")}</AOFButton>
    </main>
  );
};

export default HomePage;
