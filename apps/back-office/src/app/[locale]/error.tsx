"use client";

import { useTranslations } from "next-intl";
import {
  type ErrorBoundaryProps,
  ErrorNotice,
} from "@/features/errors/components/error-notice";

// `retry` re-fetches and re-renders the segment (stable since Next 16.3);
// `reset` would re-render the failed server payload as it was.
const ErrorPage = ({ error, retry }: ErrorBoundaryProps) => {
  const t = useTranslations("Common.Error");
  return <ErrorNotice error={error} retry={retry} t={t} />;
};

export default ErrorPage;
