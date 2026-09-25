"use client";

import { useTranslations } from "next-intl";

type ErrorProps = { error: Error & { digest?: string }; retry: () => void };

// `retry` re-fetches and re-renders the segment (stable since Next 16.3);
// `reset` would re-render the failed server payload as it was.
const ErrorPage = ({ retry }: ErrorProps) => {
  const t = useTranslations("Error");
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8">
      <h1 className="font-semibold text-2xl">{t("title")}</h1>
      <button onClick={retry} type="button">
        {t("retry")}
      </button>
    </main>
  );
};

export default ErrorPage;
