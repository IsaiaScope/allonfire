import { App, ImageAccess } from "@allonfire/database/enums";
import { useEffect } from "react";
import { AOFPictureRow } from "../components/aof-picture-row";
import { useAddImagesForm } from "../hooks/use-add-images-form";
import type {
  AOFAddImagesApps,
  AOFAddImagesDressing,
  AOFImageButtonProps,
} from "../types/add-images-dressing";
import type { AddImageRowValues } from "../utils/add-image-schema";

const Card: AOFAddImagesDressing["Card"] = (props) => <div {...props} />;
const Remove = ({ disabled, label, onClick }: AOFImageButtonProps) => (
  <button
    aria-label={label}
    disabled={disabled}
    onClick={onClick}
    type="button"
  >
    x
  </button>
);

/** The Design's pieces as plain elements. */
export const STUB_DRESSING: Pick<
  AOFAddImagesDressing,
  "Card" | "choice" | "Remove"
> = { Card, choice: { ink: "#112233", pill: "#445566" }, Remove };

export const FIXED_LAURA: AOFAddImagesApps = {
  apps: [App.LAURA],
  kind: "fixed",
};
/** The one App the options offer, and the name its toggle carries. */
export const SHELL = { name: "Shell" } as const;
export const ONE_APP: AOFAddImagesApps = {
  kind: "options",
  options: [{ label: SHELL.name, value: App.BACK_OFFICE }],
};

const rowsOf = (state: { values: { rows: AddImageRowValues[] } }) =>
  state.values.rows;

/** The picture row of one picked `file`, as the Add Images form draws it. */
export const PictureRowHarness = ({
  apps = ONE_APP,
  file,
}: {
  apps?: AOFAddImagesApps | undefined;
  file: File;
}) => {
  const form = useAddImagesForm(
    apps.kind === "fixed" ? apps.apps : apps.options.map(({ value }) => value),
    apps.kind === "fixed"
  );
  useEffect(() => {
    form.pushFieldValue("rows", {
      access: ImageAccess.PRIVATE,
      alt: { en: "", it: "" },
      apps: apps.kind === "fixed" ? [...apps.apps] : [App.BACK_OFFICE],
      file,
      id: "row-1",
      picker: "",
    });
  }, [apps, file, form]);
  return (
    <form aria-label="rows">
      <form.Subscribe selector={rowsOf}>
        {(rows) =>
          rows.map((row, index) => (
            <AOFPictureRow
              apps={apps}
              dressing={STUB_DRESSING}
              form={form}
              index={index}
              key={row.id}
              row={row}
            />
          ))
        }
      </form.Subscribe>
    </form>
  );
};
