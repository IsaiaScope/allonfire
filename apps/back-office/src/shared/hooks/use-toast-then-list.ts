"use client";

import {
  type AOFToastKind,
  aofToast,
} from "@allonfire/ui/shared/hooks/use-aof-toast";
import { useEffect, useEffectEvent } from "react";
import { useRouter } from "@/features/i18n/navigation";

/** A notice's toast before the list opens: its words and kind. */
export type ListToast = { kind: AOFToastKind; message: string };

/**
 * A form's answer that sends it back to its `list`: the notice's toast, when
 * `toasts` lists it, then the `list`, where the change shows. A notice it does
 * not list, or none, leaves the form where it is.
 *
 * `refresh` reads this browser's copies again (the action cleared the
 * server's): every write refreshes every layer. It may change between
 * renders; only a notice that is listed runs it.
 */
export const useToastThenList = <TNotice extends string>(
  list: string,
  notice: TNotice | undefined,
  toasts: Partial<Record<TNotice, ListToast>>,
  refresh?: () => Promise<unknown>
) => {
  const router = useRouter();
  const refreshCopies = useEffectEvent(() => refresh?.());
  const toast = notice === undefined ? undefined : toasts[notice];
  const kind = toast?.kind;
  const message = toast?.message;
  useEffect(() => {
    if (!(kind && message)) {
      return;
    }
    aofToast(message, kind);
    refreshCopies()?.catch(() => undefined);
    router.replace(list);
  }, [kind, message, list, router]);
};
