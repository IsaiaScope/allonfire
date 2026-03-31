"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@allonfire/ui/components/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@allonfire/ui/components/tooltip";
import { Copy, Download, Heart, Share2, Trash2 } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useHeartAnimation } from "@/features/gallery/hooks/use-heart-animation";

async function fetchImageBlob(url: string, id: string) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Fetch failed");
  }
  const blob = await res.blob();
  const ext = blob.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
  return { blob, fileName: `isaia-laura-${id}.${ext}` };
}

type PhotoPreviewProps = {
  photo: {
    id: string;
    url: string;
    thumbnailUrl: string;
    blurDataURL: string;
    width: number;
    height: number;
    isFavorite: boolean;
  };
  onClose: () => void;
  onFavoriteToggle: () => void;
  onDelete: () => void;
};

export function PhotoPreview({
  photo,
  onClose,
  onFavoriteToggle,
  onDelete,
}: PhotoPreviewProps) {
  const t = useTranslations("PhotoPreview");
  const [imageLoaded, setImageLoaded] = useState(false);
  const { animating, trigger: triggerHeartAnimation } = useHeartAnimation();

  // Feature detection — these APIs require secure context (HTTPS or localhost)
  const [canShare, setCanShare] = useState(false);
  const [canCopy, setCanCopy] = useState(false);
  useEffect(() => {
    setCanShare(typeof navigator.share === "function");
    setCanCopy(typeof navigator.clipboard?.write === "function");
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  const handleFavoriteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!photo.isFavorite) {
        triggerHeartAnimation();
      }
      onFavoriteToggle();
    },
    [onFavoriteToggle, photo.isFavorite, triggerHeartAnimation]
  );

  const handleDownload = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        const { blob, fileName } = await fetchImageBlob(photo.url, photo.id);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        toast.error(t("downloadError"));
      }
    },
    [photo.url, photo.id, t]
  );

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        // Safari requires: (1) PNG format, (2) Promise<Blob> in ClipboardItem
        // Passing a Promise preserves user activation across the async fetch
        const pngPromise = fetch(photo.url)
          .then((r) => {
            if (!r.ok) {
              throw new Error("Fetch failed");
            }
            return r.blob();
          })
          .then(
            (blob) =>
              new Promise<Blob>((resolve, reject) => {
                const img = new window.Image();
                img.crossOrigin = "anonymous";
                img.onload = () => {
                  const canvas = document.createElement("canvas");
                  canvas.width = img.naturalWidth;
                  canvas.height = img.naturalHeight;
                  const ctx = canvas.getContext("2d");
                  if (!ctx) {
                    return reject(new Error("No canvas context"));
                  }
                  ctx.drawImage(img, 0, 0);
                  canvas.toBlob(
                    (b) =>
                      b ? resolve(b) : reject(new Error("toBlob failed")),
                    "image/png"
                  );
                  URL.revokeObjectURL(img.src);
                };
                img.onerror = () => reject(new Error("Image load failed"));
                img.src = URL.createObjectURL(blob);
              })
          );

        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": pngPromise }),
        ]);
        toast.success(t("copySuccess"));
      } catch {
        toast.error(t("copyError"));
      }
    },
    [photo.url, t]
  );

  const handleShare = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        const { blob, fileName } = await fetchImageBlob(photo.url, photo.id);
        const file = new File([blob], fileName, { type: blob.type });
        await navigator.share({ files: [file] });
      } catch (err) {
        // User cancelled — not an error
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
      }
    },
    [photo.url, photo.id]
  );

  const btnClass =
    "cursor-pointer rounded-full p-2 text-white/80 transition-all hover:scale-105 hover:bg-white/5 hover:text-white active:scale-95 sm:p-2.5";
  const iconClass = "size-5 sm:size-6";
  const tooltipClass =
    "z-[100] border border-white/10 bg-zinc-900 font-medium text-white shadow-lg [&>div:last-child]:hidden";

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: backdrop click-to-close is standard for dialog overlays
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape key handled via global useEffect listener
    <div
      aria-label={t("ariaLabel")}
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2"
      onClick={onClose}
      role="dialog"
    >
      <div className="flex flex-col items-center gap-2 sm:gap-3">
        <div
          className="relative overflow-hidden rounded-lg"
          style={{
            aspectRatio: `${photo.width} / ${photo.height}`,
            width: `min(94vw, calc((90vh - 3.5rem) * ${photo.width} / ${photo.height}))`,
            maxHeight: "calc(90vh - 3.5rem)",
          }}
        >
          {/* Thumbnail placeholder — renders instantly from browser cache */}
          <Image
            alt=""
            className="h-full w-full object-contain"
            fill
            sizes="90vw"
            src={photo.thumbnailUrl}
          />
          {/* Full-res overlay — crossfades in when loaded */}
          <Image
            alt={t("fullSizeAlt")}
            className={`h-full w-full object-contain transition-opacity duration-300 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
            fill
            onLoad={() => setImageLoaded(true)}
            priority
            sizes="90vw"
            src={photo.url}
          />
        </div>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: stopPropagation prevents backdrop close */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard events handled by global listener */}
        {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: toolbar container only stops event propagation */}
        <div
          className="flex w-fit items-center gap-1.5 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 shadow-md backdrop-blur-md sm:gap-1.5 sm:px-3 sm:py-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  aria-label={
                    photo.isFavorite
                      ? t("removeFromFavorites")
                      : t("addToFavorites")
                  }
                  className="relative cursor-pointer rounded-full p-2 transition-all hover:scale-105 hover:bg-white/5 active:scale-95 sm:p-2.5"
                  onClick={handleFavoriteClick}
                  type="button"
                />
              }
            >
              <Heart
                className={`${iconClass} transition-transform duration-150 ${
                  photo.isFavorite
                    ? "scale-110 fill-red-500/85 text-red-900/50"
                    : "text-white/80 hover:text-white"
                }`}
              />
              {animating && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <Heart
                    className={`${iconClass} animate-heart-burst fill-red-500/85 text-red-900/50`}
                  />
                  <span className="absolute size-8 animate-heart-ring rounded-full border-2 border-red-500/55 sm:size-10" />
                </span>
              )}
            </TooltipTrigger>
            <TooltipContent className={tooltipClass} side="top" sideOffset={8}>
              {photo.isFavorite
                ? t("removeFromFavorites")
                : t("addToFavorites")}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  aria-label={t("downloadLabel")}
                  className={btnClass}
                  onClick={handleDownload}
                  type="button"
                >
                  <Download className={iconClass} />
                </button>
              }
            />
            <TooltipContent className={tooltipClass} side="top" sideOffset={8}>
              {t("downloadLabel")}
            </TooltipContent>
          </Tooltip>

          {/* Copy to clipboard — requires secure context */}
          {canCopy && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    aria-label={t("copyLabel")}
                    className={btnClass}
                    onClick={handleCopy}
                    type="button"
                  >
                    <Copy className={iconClass} />
                  </button>
                }
              />
              <TooltipContent
                className={tooltipClass}
                side="bottom"
                sideOffset={8}
              >
                {t("copyLabel")}
              </TooltipContent>
            </Tooltip>
          )}

          {/* Share — requires secure context */}
          {canShare && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    aria-label={t("shareLabel")}
                    className={btnClass}
                    onClick={handleShare}
                    type="button"
                  >
                    <Share2 className={iconClass} />
                  </button>
                }
              />
              <TooltipContent
                className={tooltipClass}
                side="bottom"
                sideOffset={8}
              >
                {t("shareLabel")}
              </TooltipContent>
            </Tooltip>
          )}

          <div className="mx-1 h-5 w-px bg-white/25 sm:mx-1.5 sm:h-6" />

          <AlertDialog>
            <Tooltip>
              <AlertDialogTrigger asChild>
                <TooltipTrigger
                  render={
                    <button
                      aria-label={t("deleteLabel")}
                      className="cursor-pointer rounded-full p-2 text-white/60 transition-all hover:scale-105 hover:bg-red-500/10 hover:text-red-400 active:scale-95 sm:p-2.5"
                      onClick={(e) => e.stopPropagation()}
                      type="button"
                    />
                  }
                >
                  <Trash2 className={iconClass} />
                </TooltipTrigger>
              </AlertDialogTrigger>
              <TooltipContent
                className={tooltipClass}
                side="bottom"
                sideOffset={8}
              >
                {t("deleteLabel")}
              </TooltipContent>
            </Tooltip>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("deleteDescription")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("deleteCancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>
                  {t("deleteConfirm")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
