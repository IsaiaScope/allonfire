import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import { useTranslations } from "next-intl";
import { type ChangeEvent, useCallback, useRef } from "react";

/**
 * A hidden file input for a Design's own button: `inputProps` go on an
 * `<input>`, `open` is what the button runs. What is chosen goes to `pick`,
 * and the input is emptied so the same file can be chosen again.
 */
export const useImageFileInput = (pick: (files: File[]) => void) => {
  const t = useTranslations("Common.ImageUpload.pick");
  const input = useRef<HTMLInputElement>(null);
  const open = useCallback(() => input.current?.click(), []);
  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = [...(event.currentTarget.files ?? [])];
      event.currentTarget.value = "";
      pick(files);
    },
    [pick]
  );
  const inputProps = {
    accept: IMAGE.INPUT_ACCEPT,
    "aria-label": t("input"),
    className: "sr-only",
    multiple: true,
    onChange,
    ref: input,
    tabIndex: -1,
    type: "file",
  } as const;
  return { inputProps, open };
};
