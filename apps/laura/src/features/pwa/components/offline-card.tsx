import { OCEAN_FACE } from "@allonfire/design/designs/ocean/ocean-mark";
import type { AOFOfflineCardProps } from "@allonfire/ui/features/pwa/components/aof-offline-banner";
import { IconWifiOff } from "@tabler/icons-react";
import { OceanMark } from "@/shared/components/ocean-mark";

/**
 * The offline notice's look, sent as a toast centred at the top: an ink pill
 * with the sleeping octopus, the no-connection mark, and a title over its
 * line. Ink in both schemes, like the card back.
 */
export const OfflineCard = ({ description, title }: AOFOfflineCardProps) => (
  <div className="mx-auto flex w-fit items-center gap-3 rounded-xl bg-ink px-4 py-3 font-sans text-ink-foreground shadow-lg">
    <OceanMark className="size-10" face={OCEAN_FACE.SLEEPY} tone="white" />
    <p className="flex flex-col">
      <span className="font-bold text-sm">{title}</span>
      <span className="text-ink-foreground/80 text-xs">{description}</span>
    </p>
    <IconWifiOff aria-hidden className="size-5 shrink-0" />
  </div>
);
