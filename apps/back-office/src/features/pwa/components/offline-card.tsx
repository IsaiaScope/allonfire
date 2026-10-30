import { WifiOff } from "lucide-react";
import { PWA_SIGNAGE } from "@/features/pwa/constants/pwa-signage";

export type OfflineCardProps = { description: string; title: string };

/**
 * The offline notice's look, sent as a toast centred at the top: a red
 * notice, the no-connection mark, a title over its subtitle, and 圏外 (out
 * of range) on the right.
 * The tint sits over an opaque card, so the page never shows through.
 */
export const OfflineCard = ({ description, title }: OfflineCardProps) => (
  <div className="mx-auto w-fit rounded-lg bg-card font-sans shadow-lg">
    <div className="flex items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3">
      <WifiOff aria-hidden className="size-5 shrink-0 text-destructive" />
      <p className="flex flex-col">
        <span className="font-semibold text-destructive text-sm">{title}</span>
        <span className="text-muted-foreground text-xs">{description}</span>
      </p>
      <span
        aria-hidden
        className="ms-2 font-bold text-destructive text-lg leading-none"
        lang="ja"
      >
        {PWA_SIGNAGE.OFFLINE.WALL_KANJI}
      </span>
    </div>
  </div>
);
