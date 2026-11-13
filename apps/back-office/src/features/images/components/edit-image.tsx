"use client";

import { formatSize } from "@allonfire/core/shared/utils/format-size";
import type { App } from "@allonfire/database/enums";
import type { ImageBody } from "@allonfire/storage/features/image/constants/schemas";
import { useAOFForm } from "@allonfire/ui/features/form/utils/form";
import { useAOFFormAction } from "@allonfire/ui/features/form/utils/form-submit";
import { IconDeviceFloppy, IconPhotoEdit } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useActionState, useCallback } from "react";
import { useRouter } from "@/features/i18n/navigation";
import { FormAlert } from "@/shared/components/form-alert";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { useToastThenList } from "@/shared/hooks/use-toast-then-list";
import { useCreated } from "@/shared/utils/use-created";
import { editImage } from "../actions/edit-image";
import { IMAGES } from "../constants/images";
import {
  type EditImageValues,
  editImageSchema,
} from "../utils/edit-image-schema";
import { altValuesOf } from "../utils/image-alt";
import { invalidateImages } from "../utils/images-mutations";
import { DeleteImages } from "./delete-images";
import { ImageAltFields } from "./image-alt-fields";
import { CopyName, ImageThumb } from "./image-columns";
import { ImageFact, ImageFacts } from "./image-facts";
import {
  ImageAccessRow,
  ImageAppsRow,
  ImageFormActions,
} from "./image-form-parts";

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
      <ImageFacts className="w-full @2xl:max-w-xl max-w-sm">
        <ImageFact className="col-span-2" label={t("column.name")} mono={false}>
          <CopyName className="font-mono font-semibold" name={image.key} wrap />
        </ImageFact>
        <ImageFact label={t("column.size")}>
          {formatSize(image.bytes)}
        </ImageFact>
        <ImageFact label={t("column.dimensions")}>
          {image.width} × {image.height}
        </ImageFact>
        <ImageFact label={t("column.created")}>
          {created(image.createdAt)}
        </ImageFact>
      </ImageFacts>
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
  const client = useQueryClient();
  const [{ error, notice }, action, pending] = useActionState(
    editImage.bind(null, { id: image.id, version: image.version }),
    {}
  );
  useToastThenList(
    BACK_OFFICE.PAGE.STORAGE_IMAGES,
    notice,
    {
      [IMAGES.EDIT_NOTICE.SAVED]: {
        kind: "success",
        message: t("Images.edit.saved"),
      },
    },
    () => invalidateImages(client)
  );
  // An Image changed elsewhere says so in every App's words (`Common`).
  const errorText =
    error === IMAGES.EDIT_ERROR.CHANGED
      ? t("Common.Request.changed")
      : error && t(`Images.edit.error.${error}`);
  const form = useAOFForm({
    defaultValues: fieldsOf(image),
    // A submit runs the onChange validators too.
    validators: {
      onChange: editImageSchema({
        altTooLong: t("Images.form.field.altTooLong"),
        appsRequired: t("Images.form.field.appsRequired"),
      }),
    },
  });
  const formProps = useAOFFormAction(form, action);
  const list = useCallback(
    () => router.replace(BACK_OFFICE.PAGE.STORAGE_IMAGES),
    [router]
  );
  const ids = [image.id];
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 font-bold text-2xl">
          <IconPhotoEdit aria-hidden className="size-7" />
          {t("Images.edit.title")}
        </h1>
        <DeleteImages ids={ids} onClear={list} shape="labeled" />
      </div>
      <Summary image={image} />
      <form
        aria-label={t("Images.edit.title")}
        className="flex flex-1 flex-col"
        {...formProps}
      >
        <div className="grid @2xl:grid-cols-2 grid-cols-1 @2xl:gap-x-6">
          <div className="flex flex-col">
            <ImageAltFields fields={IMAGES.FORM_FIELDS.EDIT} form={form} />
          </div>
          <div className="flex flex-col gap-8">
            <ImageAccessRow fields={IMAGES.FORM_FIELDS.EDIT} form={form} />
            <ImageAppsRow
              fields={IMAGES.FORM_FIELDS.EDIT}
              form={form}
              offered={offered}
            />
          </div>
          <FormAlert className="@2xl:col-span-2 mt-4">{errorText}</FormAlert>
        </div>
        <ImageFormActions
          pending={pending}
          submit={{
            icon: <IconDeviceFloppy aria-hidden />,
            kanji: IMAGES.SAVE_KANJI,
            label: t("Images.edit.submit"),
            pendingLabel: t("Images.edit.submitting"),
          }}
        />
      </form>
    </div>
  );
};
