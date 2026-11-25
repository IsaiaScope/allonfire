import { UNIT } from "@allonfire/core/shared/constants/units";
import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import { IconPhotoPlus } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

/**
 * The Add Images form's heading, the form's and its skeleton's alike: the
 * title (the stop focus returns to when the last row is removed), the limits
 * under it, and the Design's `picker` in the same wrapping row.
 */
export const AddImagesHeading = ({
  picker,
  title,
}: {
  picker: ReactNode;
  title: string;
}) => {
  const t = useTranslations("Common.ImageUpload.pick");
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h1
          className="flex items-center gap-2 font-bold text-2xl"
          tabIndex={-1}
        >
          <IconPhotoPlus aria-hidden className="size-7" />
          {title}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("hint", {
            files: IMAGE.LIMIT.FILES_PER_UPLOAD,
            size: IMAGE.LIMIT.FILE_BYTES / UNIT.BYTES_PER_MIB,
            total: IMAGE.LIMIT.UPLOAD.BYTES / UNIT.BYTES_PER_MIB,
          })}
        </p>
      </div>
      {picker}
    </div>
  );
};
