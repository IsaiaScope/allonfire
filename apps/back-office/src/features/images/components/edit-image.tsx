"use client";

import { formatSize } from "@allonfire/core/shared/utils/format-size";
import type { App } from "@allonfire/database/enums";
import type { ImageBody } from "@allonfire/storage/features/image/constants/schemas";
import { useToastThenList } from "@allonfire/ui/features/data-table/hooks/use-toast-then-list";
import { AOFFormAlert } from "@allonfire/ui/features/form/components/aof-form-alert";
import { useAOFForm } from "@allonfire/ui/features/form/utils/form";
import { useAOFFormAction } from "@allonfire/ui/features/form/utils/form-submit";
import { AOFImageAccessRow } from "@allonfire/ui/features/image/upload/components/aof-image-access-row";
import { AOFImageAltFields } from "@allonfire/ui/features/image/upload/components/aof-image-alt-fields";
import { AOFImageAppsRow } from "@allonfire/ui/features/image/upload/components/aof-image-apps-row";
import {
  AOFImageFact,
  AOFImageFacts,
} from "@allonfire/ui/features/image/upload/components/aof-image-facts";
import { altValuesOf } from "@allonfire/ui/features/image/upload/utils/image-alt";
import { IconDeviceFloppy, IconPhotoEdit } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useActionState, useCallback } from "react";
import { useRouter } from "@/features/i18n/navigation";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { useCreated } from "@/shared/utils/use-created";
import { editImage } from "../actions/edit-image";
import { IMAGES } from "../constants/images";
import { appOptionsOf } from "../utils/administered-apps";
import {
  type EditImageValues,
  editImageSchema,
} from "../utils/edit-image-schema";
import { invalidateImages } from "../utils/images-mutations";
import { DeleteImages } from "./delete-images";
import { CopyName, ImageThumb } from "./image-columns";
import { ImageFormActions } from "./image-form-parts";

/** The form's start: the Image as stored. */
const fieldsOf = (image: ImageBody): EditImageValues => ({
  access: image.access,
  alt: altValuesOf(image.alt),
  apps: [...image.apps],
  picker: "",
});

/** The picture as stored, with its name (its stored file's, a click copies it), size, dimensions and when it was added: read only. */
const Summary = ({ image }: { image: ImageBody }) => {
  const t = useTranslations("Images");
  const created = useCreated();
  return (
    <section
      aria-label={t("edit.summary")}
      className="flex @2xl:flex-row flex-col @2xl:gap-6 gap-4"
    >
      <ImageThumb image={image} size="page" />
      <AOFImageFacts className="w-full @2xl:max-w-xl max-w-sm">
        <AOFImageFact
          className="col-span-2"
          label={t("column.name")}
          mono={false}
        >
          <CopyName className="font-mono font-semibold" name={image.key} wrap />
        </AOFImageFact>
        <AOFImageFact label={t("column.size")}>
          {formatSize(image.bytes)}
        </AOFImageFact>
        <AOFImageFact label={t("column.dimensions")}>
          {image.width} × {image.height}
        </AOFImageFact>
        <AOFImageFact label={t("column.created")}>
          {created(image.createdAt)}
        </AOFImageFact>
      </AOFImageFacts>
    </section>
  );
};

/**
 * The Edit Image form, an AOF form (ADR 0017): the picture and its facts, then
 * its alt (every language it holds, English and Italian always), its access
 * and its Apps, and Delete. `offered` are the Apps to choose among: the ones
 * the visitor administers and the ones the Image is in. Saved on the Version
 * the form opened with. Checked here, then by the `editImage` action, whose
 * answer counts.
 */
export const EditImage = ({
  image,
  offered,
}: {
  image: ImageBody;
  offered: readonly App[];
}) => {
  const t = useTranslations();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [{ error, notice }, action, pending] = useActionState(
    editImage.bind(null, { id: image.id, version: image.version }),
    {}
  );
  useToastThenList(
    BACK_OFFICE.PAGE.STORAGE_IMAGES,
    notice,
    {
      [IMAGES.EDIT.NOTICE.SAVED]: {
        kind: "success",
        message: t("Images.edit.saved"),
      },
    },
    () => invalidateImages(queryClient)
  );
  // An Image changed elsewhere says so in every App's words (`Common`).
  const errorText =
    error === IMAGES.EDIT.ERROR.CHANGED
      ? t("Common.Request.changed")
      : error && t(`Images.edit.error.${error}`);
  const form = useAOFForm({
    defaultValues: fieldsOf(image),
    // A submit runs the onChange validators too.
    validators: {
      onChange: editImageSchema({
        altTooLong: t("Common.ImageUpload.field.altTooLong"),
        appsRequired: t("Common.ImageUpload.field.appsRequired"),
      }),
    },
  });
  const formProps = useAOFFormAction(form, action);
  const list = useCallback(
    () => router.replace(BACK_OFFICE.PAGE.STORAGE_IMAGES),
    [router]
  );
  const selectedIds = [image.id];
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 font-bold text-2xl">
          <IconPhotoEdit aria-hidden className="size-7" />
          {t("Images.edit.title")}
        </h1>
        <DeleteImages
          onClear={list}
          selectedIds={selectedIds}
          shape="labeled"
        />
      </div>
      <Summary image={image} />
      <form
        aria-label={t("Images.edit.title")}
        className="flex flex-1 flex-col"
        {...formProps}
      >
        <div className="grid @2xl:grid-cols-2 grid-cols-1 @2xl:gap-x-6">
          <div className="flex flex-col">
            <AOFImageAltFields fields={IMAGES.FORM_FIELDS.EDIT} form={form} />
          </div>
          <div className="flex flex-col gap-8">
            <AOFImageAccessRow
              fields={IMAGES.FORM_FIELDS.EDIT}
              form={form}
              ink={BACK_OFFICE.CHOSEN.INK}
              pill={BACK_OFFICE.CHOSEN.PILL}
            />
            <AOFImageAppsRow
              fields={IMAGES.FORM_FIELDS.EDIT}
              form={form}
              ink={BACK_OFFICE.CHOSEN.INK}
              options={appOptionsOf(offered)}
              pill={BACK_OFFICE.CHOSEN.PILL}
            />
          </div>
          <AOFFormAlert className="@2xl:col-span-2 mt-4">
            {errorText}
          </AOFFormAlert>
        </div>
        <ImageFormActions
          pending={pending}
          submit={{
            icon: <IconDeviceFloppy aria-hidden />,
            kanji: IMAGES.KANJI.SAVE,
            label: t("Images.edit.submit"),
            pendingLabel: t("Images.edit.submitting"),
          }}
        />
      </form>
    </div>
  );
};
