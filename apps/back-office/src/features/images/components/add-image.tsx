"use client";

import { UNIT } from "@allonfire/core/shared/constants/units";
import type { App } from "@allonfire/database/enums";
import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import { useAOFFormAction } from "@allonfire/ui/features/form/utils/form-submit";
import {
  AOFButton,
  aofButtonVariants,
} from "@allonfire/ui/shared/components/aof-button";
import {
  AOFCardContent,
  AOFCardHeader,
  AOFCardTitle,
} from "@allonfire/ui/shared/components/aof-card";
import { aofToast } from "@allonfire/ui/shared/hooks/use-aof-toast";
import { cn } from "@allonfire/ui/shared/utils/utils";
import { IconPhotoPlus, IconPlus } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  type ChangeEvent,
  useActionState,
  useCallback,
  useId,
  useRef,
  useState,
} from "react";
import { ActionKanji, kanjiAction } from "@/shared/components/brush-kanji";
import { CardFrame } from "@/shared/components/card-frame";
import { FormAlert } from "@/shared/components/form-alert";
import {
  ToolbarActionBody,
  toolbarActionClass,
} from "@/shared/components/toolbar-action";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { useToastThenList } from "@/shared/hooks/use-toast-then-list";
import { type AddImageState, addImage } from "../actions/add-image";
import { IMAGES } from "../constants/images";
import {
  type AddImageForm,
  useAddImageForm,
} from "../hooks/use-add-image-form";
import { acceptFiles, type FileRefusal } from "../utils/accept-files";
import { sharedSet } from "../utils/add-image-layout";
import type { AddImageRowValues } from "../utils/add-image-schema";
import { invalidateImages } from "../utils/images-mutations";
import {
  ImageAccessRow,
  ImageAppsRow,
  ImageFormActions,
} from "./image-form-parts";
import { PictureRow } from "./picture-row";

/** Picking files into rows, and copying the shared set onto the rows there. */
const usePicker = (form: AddImageForm, refuse: (why: FileRefusal) => void) => {
  const input = useRef<HTMLInputElement>(null);
  const open = useCallback(() => input.current?.click(), []);
  const pick = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const picked = [...(event.currentTarget.files ?? [])];
      // The same file can be picked again.
      event.currentTarget.value = "";
      const { rows, shared } = form.state.values;
      const { accepted, refused: why } = acceptFiles(
        {
          bytes: rows.reduce((sum, { file }) => sum + file.size, 0),
          count: rows.length,
        },
        picked
      );
      if (why) {
        refuse(why);
      }
      for (const file of accepted) {
        form.pushFieldValue("rows", {
          access: shared.access,
          alt: { en: "", it: "" },
          apps: [...shared.apps],
          file,
          id: crypto.randomUUID(),
          picker: "",
        });
      }
    },
    [form, refuse]
  );
  const applyToAll = useCallback(() => {
    const { rows, shared } = form.state.values;
    form.setFieldValue(
      "rows",
      rows.map((row) => ({
        ...row,
        access: shared.access,
        apps: [...shared.apps],
      }))
    );
  }, [form]);
  return { applyToAll, input, open, pick };
};

/**
 * The Add Images form, an AOF form (ADR 0017): pick up to
 * `IMAGE.LIMIT.FILES_PER_UPLOAD` pictures, and each becomes a row with its
 * preview, alt (every Base language and any other), access and Apps. The
 * shared set at the top seeds each row as it is picked; "Apply to all" copies
 * it onto the rows already there. One Save sends them all in one request:
 * every Image or none. `apps` are the Apps the visitor administers. Checked
 * here, then by the `addImage` action, whose answer counts.
 */
export const AddImage = ({ apps }: { apps: readonly App[] }) => {
  const t = useTranslations();
  const client = useQueryClient();
  const [answer, action, pending] = useActionState(addImage, {});
  const { added, notice } = answer;
  useToastThenList(
    BACK_OFFICE.PAGE.STORAGE_IMAGES,
    notice,
    {
      [IMAGES.ADD_NOTICE.ADDED]: {
        kind: "success",
        message: t("Images.add.added", { count: added ?? 0 }),
      },
    },
    () => invalidateImages(client)
  );
  const form = useAddImageForm(apps, {
    altTooLong: t("Images.form.field.altTooLong"),
    appsRequired: t("Images.form.field.appsRequired"),
    fileTooLarge: t("Images.form.field.fileTooLarge"),
    tooManyFiles: t("Images.form.field.tooManyFiles"),
    totalTooLarge: t("Images.form.field.totalTooLarge"),
  });
  const formProps = useAOFFormAction(form, action);
  // A file left out at pick time says why in a toast: the rows stay as they were.
  const refuse = useCallback(
    (why: FileRefusal) => aofToast(t(`Images.form.field.${why}`), "error"),
    [t]
  );
  const { applyToAll, input, open, pick } = usePicker(form, refuse);
  const sharedId = useId();
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="flex items-center gap-2 font-bold text-2xl">
            <IconPhotoPlus aria-hidden className="size-7" />
            {t("Images.add.title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("Images.add.pick.hint", {
              files: IMAGE.LIMIT.FILES_PER_UPLOAD,
              size: IMAGE.LIMIT.FILE_BYTES / UNIT.BYTES_PER_MIB,
            })}
          </p>
        </div>
        <input
          accept={IMAGE.INPUT_ACCEPT}
          aria-label={t("Images.add.pick.input")}
          className="sr-only"
          multiple
          onChange={pick}
          ref={input}
          tabIndex={-1}
          type="file"
        />
        <AOFButton
          aria-label={t("Images.add.pick.button")}
          className={toolbarActionClass("labeled")}
          onClick={open}
          type="button"
        >
          <ToolbarActionBody
            icon={<IconPlus aria-hidden />}
            kanjiProps={{ kanji: IMAGES.ADD_KANJI }}
            label={t("Images.add.pick.button")}
            shape="labeled"
          />
        </AOFButton>
      </div>
      <form
        aria-label={t("Images.add.title")}
        className="flex flex-1 flex-col gap-8"
        {...formProps}
      >
        <CardFrame
          aria-labelledby={sharedId}
          kanji={IMAGES.ADD_KANJI}
          role="group"
        >
          <AOFCardHeader>
            <AOFCardTitle className="text-lg" id={sharedId}>
              {t("Images.add.shared.title")}
            </AOFCardTitle>
          </AOFCardHeader>
          <AOFCardContent>
            {/* Apply to all sits under Access, in the room its column leaves beside the Apps. */}
            <div className={sharedSet({ part: "grid" })}>
              <ImageAccessRow fields="shared" form={form} />
              <div className={sharedSet({ part: "apps" })}>
                <ImageAppsRow fields="shared" form={form} offered={apps} />
              </div>
              <form.Subscribe selector={countOf}>
                {(count) => (
                  <AOFButton
                    className={cn(
                      aofButtonVariants({ size: "field" }),
                      kanjiAction(),
                      sharedSet({ part: "apply" })
                    )}
                    disabled={count === 0}
                    onClick={applyToAll}
                    type="button"
                  >
                    <ActionKanji kanji={IMAGES.APPLY_KANJI} />
                    {t("Images.add.shared.apply")}
                  </AOFButton>
                )}
              </form.Subscribe>
            </div>
          </AOFCardContent>
        </CardFrame>
        <form.Subscribe selector={selectRows}>
          {(rows) =>
            rows.length === 0 ? (
              <p className="text-muted-foreground">
                {t("Images.add.pick.none")}
              </p>
            ) : (
              rows.map((row, index) => (
                <PictureRow
                  form={form}
                  index={index}
                  key={row.id}
                  offered={apps}
                  row={row}
                />
              ))
            )
          }
        </form.Subscribe>
        <form.Subscribe selector={filesOf}>
          {(files) => <Refusal answer={answer} files={files} />}
        </form.Subscribe>
        <form.Subscribe selector={countOf}>
          {(count) => (
            <ImageFormActions
              disabled={count === 0}
              pending={pending}
              submit={{
                icon: <IconPhotoPlus aria-hidden />,
                kanji: IMAGES.ADD_KANJI,
                label: t("Images.add.submit"),
                pendingLabel: t("Images.add.submitting"),
              }}
            />
          )}
        </form.Subscribe>
      </form>
    </div>
  );
};

/**
 * Why the API refused the files sent. It was about those files, so it leaves
 * once they change (one added or removed), while typing in a row keeps it: the
 * same files are still going to be sent. Never an effect: the answer is
 * compared with the files it was given for, while rendering.
 */
const Refusal = ({
  answer,
  files,
}: {
  answer: AddImageState;
  files: string;
}) => {
  const t = useTranslations("Images.add.error");
  const [given, setGiven] = useState({ answer, files });
  if (given.answer !== answer) {
    setGiven({ answer, files });
  }
  const { error } = answer;
  const text = error !== undefined && given.files === files ? t(error) : null;
  return <FormAlert className="mt-4">{text}</FormAlert>;
};

type RowsState = { values: { rows: AddImageRowValues[] } };

const selectRows = (state: RowsState) => state.values.rows;
/** The picked files by their rows' keys: it changes when one is added or removed, never when its fields are typed in. */
const filesOf = (state: RowsState) =>
  state.values.rows.map(({ id }) => id).join(" ");
const countOf = (state: RowsState) => state.values.rows.length;
