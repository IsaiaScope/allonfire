"use client";

import { IconDownload, IconShare } from "@tabler/icons-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ComponentPropsWithoutChildren } from "../../../shared/types/types";
import { cn } from "../../../shared/utils/utils";
import { IMAGE } from "../constants/image";
import type { ExportResult } from "../constants/image-schema";
import {
  canShareExport,
  downloadExport,
  prepareExport,
  shareFile,
} from "../utils/send-export";
import { AOFLightboxButton } from "./aof-lightbox-button";

/** Nothing changes while a page is open, so there is nothing to subscribe to. */
const subscribeNever = () => () => undefined;
const cannotShareOnTheServer = () => false;

export type AOFExportActionsProps = ComponentPropsWithoutChildren<"div"> & {
  /** The API's Export address for the Image. */
  exportUrl: string;
  /** What the saved or shared file is called (`exportName`). */
  fileName: string;
  labels: { download: string; share: string };
  /** Nothing was saved. Say so in the page's words. */
  onDownloadFailed: () => void;
  /** The API no longer finds the Image, so trying again cannot work: said instead of a failure. Read the page's data again. */
  onGone: () => void;
  /** The file arrived too late for the tap that asked: it is kept, and the next press shares it. Say so in the page's words, clear of these controls. */
  onShareReady: () => void;
  /** Sharing failed (not: the person closed the sheet). Say so in the page's words. */
  onShareFailed: () => void;
};

/**
 * Download and Share for an Image's Export (ADR 0036), icon buttons for a
 * capsule of controls. A press fetches the Export (unless Share keeps its file,
 * below), so a refusal stays on the page: Download then saves the file, Share
 * sends it through the share sheet and shows only where the browser says it can
 * send that file, from the first client render. Where the browser refuses the
 * sheet because the fetch outlived the tap (iOS, on a slow connection), the
 * file is kept and every later Share of this Image sends it, with no new
 * request. One runs at a time: while it does, both are disabled (and keep their
 * focus), since a second `share()` is refused while the sheet is open. Another
 * `exportUrl` (the next Image) or leaving the page (a closed preview) drops the
 * one under way and the file kept.
 */
export const AOFExportActions = ({
  className,
  exportUrl,
  fileName,
  labels,
  onDownloadFailed,
  onGone,
  onShareFailed,
  onShareReady,
  ...props
}: AOFExportActionsProps) => {
  const canShare = useSyncExternalStore(
    subscribeNever,
    canShareExport,
    cannotShareOnTheServer
  );
  const [busy, setBusy] = useState(false);
  const underWay = useRef<{ controller: AbortController; url: string } | null>(
    null
  );
  /** The file a refused sheet left waiting for the next press: one at most. */
  const kept = useRef<{ file: File; url: string } | null>(null);
  /** What belongs to the Export at `url` goes: the run under way and the file kept. */
  const drop = useCallback((url: string) => {
    if (underWay.current?.url === url) {
      underWay.current.controller.abort();
      underWay.current = null;
      setBusy(false);
    }
    if (kept.current?.url === url) {
      kept.current = null;
    }
  }, []);
  // Once another Export is on screen, or none.
  useEffect(() => () => drop(exportUrl), [drop, exportUrl]);
  const run = useCallback(
    async (
      send: (signal: AbortSignal) => Promise<ExportResult>,
      onFailed: () => void
    ) => {
      const controller = new AbortController();
      underWay.current = { controller, url: exportUrl };
      setBusy(true);
      const result = await send(controller.signal);
      // Dropped: the controls on screen are no longer this run's to touch.
      if (controller.signal.aborted) {
        return;
      }
      setBusy(false);
      if (result === IMAGE.EXPORT.RESULT.GONE) {
        onGone();
      } else if (result === IMAGE.EXPORT.RESULT.FAILED) {
        onFailed();
      }
    },
    [exportUrl, onGone]
  );
  const download = useCallback(
    () =>
      run(
        (signal) => downloadExport(exportUrl, fileName, signal),
        onDownloadFailed
      ),
    [exportUrl, fileName, onDownloadFailed, run]
  );
  const share = useCallback(
    () =>
      run(async (signal) => {
        const waiting = kept.current?.file;
        // No `await` while a file waits: `share()` must run inside the tap.
        const file =
          waiting ?? (await prepareExport(exportUrl, fileName, signal));
        if (!file) {
          return IMAGE.EXPORT.RESULT.FAILED;
        }
        if (file === IMAGE.EXPORT.RESULT.GONE) {
          return file;
        }
        const result = await shareFile(file);
        if (signal.aborted || result !== IMAGE.EXPORT.RESULT.BLOCKED) {
          return result;
        }
        // Refused straight from a tap: waiting was not why, so give up on it.
        if (waiting) {
          kept.current = null;
          return IMAGE.EXPORT.RESULT.FAILED;
        }
        kept.current = { file, url: exportUrl };
        onShareReady();
        return result;
      }, onShareFailed),
    [exportUrl, fileName, onShareFailed, onShareReady, run]
  );
  return (
    <div className={cn("flex items-center gap-1", className)} {...props}>
      <AOFLightboxButton
        disabled={busy}
        focusableWhenDisabled
        label={labels.download}
        onClick={download}
      >
        <IconDownload aria-hidden />
      </AOFLightboxButton>
      {canShare ? (
        <AOFLightboxButton
          disabled={busy}
          focusableWhenDisabled
          label={labels.share}
          onClick={share}
        >
          <IconShare aria-hidden />
        </AOFLightboxButton>
      ) : null}
    </div>
  );
};
