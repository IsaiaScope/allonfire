import type { App } from "@allonfire/database/enums";
import type { ComponentProps, ComponentType } from "react";

export type AOFImageButtonProps = {
  disabled?: boolean;
  label: string;
  onClick: () => void;
};

export type AOFImagePickerProps = {
  disabled: boolean;
  pick: (files: File[]) => void;
};

export type AOFImageActionsProps = {
  cancelHref: string;
  cancelLabel: string;
  disabled: boolean;
  pending: boolean;
  pendingLabel: string;
  submitLabel: string;
};

/**
 * What a Design changes in the Add Images form (ADR 0033): every piece it
 * draws with its own look. Everything else, the state, the limits and the
 * posted rows, is the form's.
 */
export type AOFAddImagesDressing = {
  /** Cancel back to the list, and the submit. */
  Actions: ComponentType<AOFImageActionsProps>;
  ActionsSkeleton: ComponentType;
  /** "Apply to all pictures". */
  Apply: ComponentType<AOFImageButtonProps>;
  /** A block's frame: the shared set, a picture's row. */
  Card: ComponentType<ComponentProps<"div">>;
  /** The chosen option's colours of Access and Apps, as hex. */
  choice: { ink: string; pill: string };
  /** A button or a drop area, placed in the heading's row. */
  Picker: ComponentType<AOFImagePickerProps>;
  PickerSkeleton: ComponentType;
  /** Takes one picture's row out. */
  Remove: ComponentType<AOFImageButtonProps>;
};

/** Where an Image can be placed from the form. */
export type AOFAddImagesApps =
  /** Pick among them, starting on the first. */
  | { kind: "options"; options: readonly { label: string; value: App }[] }
  /** No picker: every Image goes to these Apps. */
  | { kind: "fixed"; apps: readonly [App, ...App[]] };

/** The words only the App knows. */
export type AOFAddImagesLabels = {
  added: (count: number) => string;
  submit: string;
  submitting: string;
  title: string;
};
