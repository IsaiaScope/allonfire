"use client";

import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import { IconPhotoCirclePlus } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import {
  AOFFileUpload,
  type AOFFileUploadProps,
} from "../../../../shared/components/aof-file-upload";
import { aofToast } from "../../../../shared/hooks/use-aof-toast";

/** No row is held under the area: a picked picture becomes a row of the form. */
const NO_ITEMS: AOFFileUploadProps["items"] = [];
const keep = () => undefined;
/** A file the area refuses is told in a toast, in its words. */
const tell = (_file: File, message: string) => aofToast(message, "error");

/**
 * The picture picker as a drop area (a click, a drop, a paste or the
 * keyboard): `pick` gets every picture taken at once. It names the picture
 * types it takes, and leaves the limits to the form's heading (the same line
 * twice on one page read as a mistake). It refuses a file that is no picture
 * or is too large, telling why; the count and the total are `pick`'s to judge.
 */
export const AOFImageDropzone = ({
  pick,
  ...props
}: Pick<AOFFileUploadProps, "className" | "disabled" | "triggerProps"> & {
  pick: (files: File[]) => void;
}) => {
  const t = useTranslations("Common.ImageUpload");
  return (
    <AOFFileUpload
      accept={IMAGE.INPUT_ACCEPT}
      icon={
        <IconPhotoCirclePlus
          aria-hidden
          className="size-5 text-muted-foreground"
        />
      }
      items={NO_ITEMS}
      label={t("pick.input")}
      labels={{
        choose: t("dropzone.choose"),
        drop: t("dropzone.drop"),
        formats: t("dropzone.formats"),
        remove: t("dropzone.remove"),
        tooLarge: t("field.fileTooLarge"),
        wrongType: t("dropzone.wrongType"),
      }}
      maxBytes={IMAGE.LIMIT.FILE_BYTES}
      multiple
      onAccept={pick}
      onFileReject={tell}
      onRemove={keep}
      {...props}
    />
  );
};
