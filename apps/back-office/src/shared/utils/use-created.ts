import { DATE } from "@allonfire/core/features/i18n/constants/dates";
import { useFormatter } from "next-intl";
import { useCallback } from "react";

/** When a row was created, as a day in the page's language. */
export const useCreated = () => {
  const format = useFormatter();
  return useCallback(
    (createdAt: string) =>
      format.dateTime(new Date(createdAt), DATE.FORMAT.DAY),
    [format]
  );
};
