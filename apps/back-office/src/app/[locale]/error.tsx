"use client";

import { AOFButton } from "@allonfire/ui/components/aof-button";
import { AOFPage } from "@allonfire/ui/components/aof-page";
import { useTranslations } from "next-intl";

type ErrorProps = { error: Error & { digest?: string }; retry: () => void };

// `retry` re-fetches and re-renders the segment (stable since Next 16.3);
// `reset` would re-render the failed server payload as it was.
const ErrorPage = ({ retry }: ErrorProps) => {
  const t = useTranslations("Common.Error");
  return (
    <AOFPage layout="centered">
      <h1 className="font-semibold text-2xl">{t("title")}</h1>
      <AOFButton onClick={retry} type="button">
        {t("retry")}
      </AOFButton>
    </AOFPage>
  );
};

export default ErrorPage;
