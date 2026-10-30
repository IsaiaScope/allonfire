import {
  type InstallStep,
  PWA,
} from "@allonfire/core/features/next/pwa/constants/pwa";
import { AOFButton } from "@allonfire/ui/components/aof-button";
import type { ComponentPropsWithoutChildren } from "@allonfire/ui/lib/types";
import { cn } from "@allonfire/ui/lib/utils";
import {
  AppWindow,
  Download,
  LoaderCircle,
  type LucideIcon,
  Share,
  SquarePlus,
  X,
} from "lucide-react";
import type { ComponentProps } from "react";
import { PWA_SIGNAGE } from "@/features/pwa/constants/pwa-signage";

const { STEP } = PWA.INSTALL_HINT;

/** The control each step points at, drawn as the browser draws it. */
const STEP_ICON = {
  [STEP.IOS_ADD]: SquarePlus,
  [STEP.IOS_SHARE]: Share,
  [STEP.MAC_ADD_TO_DOCK]: AppWindow,
} as const satisfies Record<InstallStep, LucideIcon>;

/** The card's `<aside>` (named by `aria-label`), plus its words and buttons. */
export type InstallHintCardProps = ComponentPropsWithoutChildren<"aside"> & {
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

/** The line-coloured Install button: a spinner while `pending`, disabled. */
const InstallButton = ({
  children,
  className,
  pending,
  ...props
}: NonNullable<InstallHintCardProps["installProps"]>) => (
  <AOFButton
    size="sm"
    type="button"
    {...props}
    className={cn(
      "@sm:col-span-1 col-span-full @sm:col-start-3 @sm:row-start-1 @sm:min-w-36 bg-line text-led-panel hover:bg-line/90",
      className
    )}
    disabled={pending}
  >
    {pending ? (
      <LoaderCircle aria-hidden className="motion-safe:animate-spin" />
    ) : (
      <Download aria-hidden />
    )}
    {children}
  </AOFButton>
);

/**
 * The Install hint's card, sent as a toast: a night bar headed by 導入 in the
 * line's colour and the words, with a line-coloured Install button on the
 * same row when the card has room, else on a row of its own at full width
 * (a phone); or the browser's steps below, numbered like platforms, their
 * icons in the ✕'s column. A failed install says so under the words. The
 * button keeps one width, so Installing and an error change only words.
 */
export const InstallHintCard = ({
  className,
  cta,
  dismissProps,
  error,
  installProps,
  steps,
  ...props
}: InstallHintCardProps) => (
  <aside
    className={cn(
      "@container dark flex w-md flex-col gap-3 rounded-lg border border-led-dim bg-led-panel p-3 font-sans text-foreground shadow-lg max-[600px]:w-full",
      className
    )}
    {...props}
  >
    {/* Narrow: 導入, the words and ✕ on one row, the button on its own
        below, full width. Once the card has room (@sm), the button joins
        the row before ✕. */}
    <div className="grid @sm:grid-cols-[auto_1fr_auto_auto] grid-cols-[auto_1fr_auto] items-center gap-3">
      <span
        aria-hidden
        className="col-start-1 row-start-1 font-bold text-lg text-line leading-none"
        lang="ja"
      >
        {PWA_SIGNAGE.INSTALL_KANJI}
      </span>
      <p className="col-start-2 row-start-1 min-w-0 font-medium text-sm">
        {cta}
      </p>
      <AOFButton
        size="icon-sm"
        type="button"
        variant="ghost"
        {...dismissProps}
        className={cn(
          "@sm:col-start-4 col-start-3 row-start-1",
          dismissProps.className
        )}
      >
        <X aria-hidden />
      </AOFButton>
      {/* Under the words, before a narrow card's button row. */}
      {error ? (
        <p
          className="col-start-2 -col-end-1 -mt-1.5 text-destructive text-sm"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {installProps ? <InstallButton {...installProps} /> : null}
    </div>
    {steps ? (
      <ol className="flex flex-col gap-2">
        {steps.map(({ step, text }, index) => {
          const Icon = STEP_ICON[step];
          return (
            <li className="flex items-center gap-2.5 text-sm" key={step}>
              <span
                aria-hidden
                className="grid size-6 shrink-0 place-items-center rounded-sm border border-led-dim font-led text-led text-xs"
              >
                {index + 1}
              </span>
              <span className="flex-1 text-muted-foreground">{text}</span>
              {/* The ✕'s box, so the icons stand in its column. */}
              <span
                aria-hidden
                className="grid size-7 shrink-0 place-items-center"
              >
                <Icon className="size-4 text-muted-foreground" />
              </span>
            </li>
          );
        })}
      </ol>
    ) : null}
  </aside>
);
