"use client";

import type { ImageAccess } from "@allonfire/database/enums";
import { useSelector } from "@tanstack/react-form";
import { useTranslations } from "next-intl";
import { useActionState, useId, useState } from "react";
import {
  AOFCardContent,
  AOFCardHeader,
  AOFCardTitle,
} from "../../../../shared/components/aof-card";
import { useToastThenList } from "../../../data-table/hooks/use-toast-then-list";
import { AOFFormAlert } from "../../../form/components/aof-form-alert";
import { useAOFFormAction } from "../../../form/utils/form-submit";
import { IMAGE } from "../../constants/image";
import { useAddImagesForm } from "../hooks/use-add-images-form";
import { useImageRows } from "../hooks/use-image-rows";
import type {
  AOFAddImagesApps,
  AOFAddImagesDressing,
  AOFAddImagesLabels,
} from "../types/add-images-dressing";
import type {
  AddImageRowValues,
  AddImageState,
} from "../utils/add-image-schema";
import { addImagesLayout, hasImageChoices } from "../utils/add-images-layout";
import { AddImagesHeading } from "./add-images-heading";
import { AOFImageAccessRow } from "./aof-image-access-row";
import { AOFImageAppsRow } from "./aof-image-apps-row";
import { AOFPictureRow } from "./aof-picture-row";

type RowsState = { values: { rows: AddImageRowValues[] } };

const selectRows = (state: RowsState) => state.values.rows;
/** The picked files by their rows' keys: it changes when one is added or removed, never when its fields are typed in. */
const filesOf = (state: RowsState) =>
  state.values.rows.map(({ id }) => id).join(" ");
const countOf = (state: RowsState) => state.values.rows.length;

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
  const t = useTranslations("Common.ImageUpload.error");
  const [given, setGiven] = useState({ answer, files });
  if (given.answer !== answer) {
    setGiven({ answer, files });
  }
  const { error } = answer;
  const text = error !== undefined && given.files === files ? t(error) : null;
  return <AOFFormAlert className="mt-4">{text}</AOFFormAlert>;
};

/** The Apps the form places Images in, by whom: the ones to choose among or the fixed ones. */
const appsOf = (apps: AOFAddImagesApps) =>
  apps.kind === "fixed" ? apps.apps : apps.options.map(({ value }) => value);

/**
 * The Add Images form, an AOF form (ADR 0017), in any App: pick up to
 * `IMAGE.LIMIT.FILES_PER_UPLOAD` pictures, and each becomes a row with its
 * preview, alt (every Base language and any other), access and, where they are
 * chosen, Apps. The shared set at the top seeds each row as it is picked;
 * "Apply to all" copies it onto the rows already there. One Save sends them
 * all in one request: every Image or none. The App's Design is `dressing`,
 * its words `labels`, its `action` the one that counts (checked here first).
 */
export const AOFAddImages = ({
  access,
  action,
  apps,
  dressing,
  labels,
  list,
  refresh,
}: {
  /** Set when every Image has this access (an App whose photos are never public): no Access to choose, and the action gives it. */
  access?: ImageAccess | undefined;
  action: (state: AddImageState, form: FormData) => Promise<AddImageState>;
  apps: AOFAddImagesApps;
  dressing: AOFAddImagesDressing;
  labels: AOFAddImagesLabels;
  /** Where Cancel and a saved add go. */
  list: string;
  /** This browser's copies, read again after a saved add. */
  refresh: () => Promise<unknown>;
}) => {
  const t = useTranslations("Common.ImageUpload");
  const [answer, formAction, pending] = useActionState(action, {});
  const { added, notice } = answer;
  useToastThenList(
    list,
    notice,
    {
      [IMAGE.UPLOAD.NOTICE.ADDED]: {
        kind: "success",
        message: labels.added(added ?? 0),
      },
    },
    refresh
  );
  const form = useAddImagesForm(appsOf(apps), apps.kind === "fixed");
  const formProps = useAOFFormAction(form, formAction);
  const { applyToAll, pick, root } = useImageRows(form);
  const rows = useSelector(form.store, selectRows);
  const sharedId = useId();
  const { Actions, Apply, Card, choice, Picker } = dressing;
  return (
    <div className="flex flex-1 flex-col gap-6" ref={root}>
      <AddImagesHeading
        picker={<Picker disabled={pending} pick={pick} />}
        title={labels.title}
      />
      <form
        aria-label={labels.title}
        className="flex flex-1 flex-col gap-8"
        {...formProps}
      >
        {hasImageChoices(access, apps) ? (
          <Card aria-labelledby={sharedId} role="group">
            <AOFCardHeader>
              <AOFCardTitle className="text-lg" id={sharedId}>
                {t("shared.title")}
              </AOFCardTitle>
            </AOFCardHeader>
            <AOFCardContent>
              {/* Apply to all sits under Access, in the room its column leaves beside the Apps. */}
              <div className={addImagesLayout({ part: "grid" })}>
                {access === undefined ? (
                  <AOFImageAccessRow fields="shared" form={form} {...choice} />
                ) : null}
                {apps.kind === "options" ? (
                  <div className={addImagesLayout({ part: "apps" })}>
                    <AOFImageAppsRow
                      fields="shared"
                      form={form}
                      options={apps.options}
                      {...choice}
                    />
                  </div>
                ) : null}
                <div className={addImagesLayout({ part: "apply" })}>
                  <Apply
                    disabled={rows.length === 0}
                    label={t("shared.apply")}
                    onClick={applyToAll}
                  />
                </div>
              </div>
            </AOFCardContent>
          </Card>
        ) : null}
        {rows.length === 0 ? (
          <p className="text-muted-foreground">{t("pick.none")}</p>
        ) : (
          rows.map((row, index) => (
            <AOFPictureRow
              access={access}
              apps={apps}
              dressing={dressing}
              form={form}
              index={index}
              key={row.id}
              row={row}
            />
          ))
        )}
        <form.Subscribe selector={filesOf}>
          {(files) => <Refusal answer={answer} files={files} />}
        </form.Subscribe>
        <form.Subscribe selector={countOf}>
          {(count) => (
            <Actions
              cancelHref={list}
              cancelLabel={t("cancel")}
              disabled={count === 0}
              pending={pending}
              pendingLabel={labels.submitting}
              submitLabel={labels.submit}
            />
          )}
        </form.Subscribe>
      </form>
    </div>
  );
};
