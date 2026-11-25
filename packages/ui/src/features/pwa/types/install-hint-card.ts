import type { InstallStep } from "@allonfire/core/features/next/pwa/constants/pwa-schema";
import type { ComponentProps } from "react";
import type { AOFButton } from "../../../shared/components/aof-button";
import type { ComponentPropsWithoutChildren } from "../../../shared/types/types";

/**
 * What an App's Install hint card takes (the card is its Design's): the
 * `<aside>` (named by `aria-label`), plus its words and buttons.
 */
export type AOFInstallHintCardProps = ComponentPropsWithoutChildren<"aside"> & {
  cta: string;
  /** The ✕ button's own props: its name (`aria-label`), its `onClick`. */
  dismissProps: ComponentPropsWithoutChildren<typeof AOFButton>;
  /** Said under the words after a failed install. */
  error?: string | undefined;
  /** The Install button's own props, its label as children, where the
   *  browser offers its own dialog; `pending` disables it and spins. */
  installProps?:
    | (Omit<ComponentProps<typeof AOFButton>, "disabled"> & {
        pending: boolean;
      })
    | undefined;
  /** The browser's steps, where it offers no dialog. */
  steps?: { step: InstallStep; text: string }[] | undefined;
};
