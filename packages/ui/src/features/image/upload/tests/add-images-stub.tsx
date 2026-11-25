import { App } from "@allonfire/database/enums";
import { useImageFileInput } from "../hooks/use-image-file-input";
import type {
  AOFAddImagesApps,
  AOFAddImagesDressing,
  AOFImageActionsProps,
  AOFImageButtonProps,
  AOFImagePickerProps,
} from "../types/add-images-dressing";
import { uploadCopy } from "./image-upload-copy";
import { STUB_DRESSING } from "./picture-row-harness";

/** The names the stub Apps carry. */
export const STUB_APP = {
  BACK_OFFICE: "Shell",
  LAURA: "Reef",
} as const;
export const STUB_OPTIONS: AOFAddImagesApps = {
  kind: "options",
  options: [
    { label: STUB_APP.BACK_OFFICE, value: App.BACK_OFFICE },
    { label: STUB_APP.LAURA, value: App.LAURA },
  ],
};
export const STUB_FIXED: AOFAddImagesApps = {
  apps: [App.LAURA],
  kind: "fixed",
};

/** The picker's size, which its skeleton keeps. */
const PICKER_PX = { height: 44, width: 176 } as const;
/** The actions row's button height, which its skeleton keeps. */
const ACTION_PX = 44;

const Picker = ({ disabled, pick }: AOFImagePickerProps) => {
  const { inputProps, open } = useImageFileInput(pick);
  return (
    <>
      <input {...inputProps} />
      <button
        disabled={disabled}
        onClick={open}
        style={PICKER_PX}
        type="button"
      >
        {uploadCopy("pick.button")}
      </button>
    </>
  );
};

const Apply = ({ disabled, label, onClick }: AOFImageButtonProps) => (
  <button
    disabled={disabled}
    onClick={onClick}
    style={{ height: "var(--field-height)" }}
    type="button"
  >
    {label}
  </button>
);

const Actions = ({
  cancelHref,
  cancelLabel,
  disabled,
  pending,
  pendingLabel,
  submitLabel,
}: AOFImageActionsProps) => {
  const label = pending ? pendingLabel : submitLabel;
  return (
    <div style={{ height: ACTION_PX }}>
      <a href={cancelHref}>{cancelLabel}</a>
      <button disabled={disabled || pending} type="submit">
        {label}
      </button>
    </div>
  );
};

const ActionsSkeleton = () => <div aria-hidden style={{ height: ACTION_PX }} />;
const PickerSkeleton = () => <div aria-hidden style={PICKER_PX} />;

/** Every piece of a Design as plain elements. */
export const STUB_DRESSING_FULL: AOFAddImagesDressing = {
  ...STUB_DRESSING,
  Actions,
  ActionsSkeleton,
  Apply,
  Picker,
  PickerSkeleton,
};
