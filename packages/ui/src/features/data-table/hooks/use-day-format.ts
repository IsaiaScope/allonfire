import { DATE } from "@allonfire/core/features/i18n/constants/dates";
import { useFormatter } from "next-intl";
import { useCallback } from "react";

/**
 * Writes a day (`YYYY-MM-DD`, a list's date range) in the visitor's language,
 * as the day it names whatever their zone: `Nov 26, 2026`.
 */
export const useDayFormat = () => {
  const format = useFormatter();
  return useCallback(
    (day: string) =>
      format.dateTime(new Date(`${day}T00:00:00.000Z`), DATE.FORMAT.DAY),
    [format]
  );
};
