import {
  type InstallStep,
  PWA,
} from "@allonfire/core/features/next/pwa/constants/pwa";
import { AOFInstallSteps } from "@allonfire/ui/features/pwa/components/aof-install-steps";
import type { AOFInstallHintCardProps } from "@allonfire/ui/features/pwa/types/install-hint-card";
import { AOFButton } from "@allonfire/ui/shared/components/aof-button";
import { cn } from "@allonfire/ui/shared/utils/utils";
import {
  type Icon,
  IconAppWindow,
  IconDownload,
  IconLoader2,
  IconShare2,
  IconSquarePlus,
  IconX,
} from "@tabler/icons-react";
import { OceanArt } from "@/shared/components/ocean-art";
import { MASCOT } from "@/shared/constants/mascots";

const { STEP } = PWA.INSTALL_HINT;

/** The control each step points at, drawn as the browser draws it. */
const STEP_ICON = {
  [STEP.IOS_ADD]: IconSquarePlus,
  [STEP.IOS_SHARE]: IconShare2,
  [STEP.MAC_ADD_TO_DOCK]: IconAppWindow,
} as const satisfies Record<InstallStep, Icon>;

/** The Install button: a spinner while `pending`, disabled. */
const InstallButton = ({
  children,
  className,
  pending,
  ...props
}: NonNullable<AOFInstallHintCardProps["installProps"]>) => (
  <AOFButton
    size="sm"
    type="button"
    {...props}
    className={cn(
      "@sm:col-span-1 col-span-full @sm:col-start-3 @sm:row-start-1 @sm:min-w-36 font-bold",
      className
    )}
    disabled={pending}
  >
    {pending ? (
      <IconLoader2 aria-hidden className="motion-safe:animate-spin" />
    ) : (
      <IconDownload aria-hidden />
    )}
    {children}
  </AOFButton>
);

/**
 * The Install hint's card, sent as a toast: an ink card (ink in both
 * schemes) with the octopus and the words, an Install button on the
 * same row when the card has room, else on a row of its own (a phone); or
 * the browser's steps below, their icons in the ✕'s column. A failed install
 * says so under the words.
 */
export const InstallHintCard = ({
  className,
  cta,
  dismissProps,
  error,
  installProps,
  steps,
  ...props
}: AOFInstallHintCardProps) => (
  <aside
    className={cn(
      "@container flex w-md flex-col gap-3 rounded-xl bg-ink p-3 font-sans text-ink-foreground shadow-lg max-[600px]:w-full",
      className
    )}
    {...props}
  >
    <div className="grid @sm:grid-cols-[auto_1fr_auto_auto] grid-cols-[auto_1fr_auto] items-center gap-3">
      <OceanArt
        art={MASCOT.INSTALL}
        className="col-start-1 row-start-1 size-10"
      />
      <p className="col-start-2 row-start-1 min-w-0 font-bold text-sm">{cta}</p>
      <AOFButton
        size="icon-sm"
        type="button"
        variant="ghost"
        {...dismissProps}
        className={cn(
          "@sm:col-start-4 col-start-3 row-start-1 text-ink-foreground hover:bg-ink-foreground/15 hover:text-ink-foreground",
          dismissProps.className
        )}
      >
        <IconX aria-hidden />
      </AOFButton>
      {error ? (
        <p className="col-start-2 -col-end-1 -mt-1.5 text-sm" role="alert">
          {error}
        </p>
      ) : null}
      {installProps ? <InstallButton {...installProps} /> : null}
    </div>
    {steps ? (
      <AOFInstallSteps
        classNames={{
          number: "rounded-md border border-ink-foreground/40 font-bold",
        }}
        icons={STEP_ICON}
        steps={steps}
      />
    ) : null}
  </aside>
);
