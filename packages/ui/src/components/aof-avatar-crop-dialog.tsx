"use client";

import {
  Cropper,
  CropperArea,
  type CropperAreaData,
  CropperImage,
  type CropperPoint,
} from "@allonfire/shadcn/components/cropper";
import { AVATAR } from "@allonfire/storage/features/avatar/constants/avatar";
import {
  IconArrowBackUp,
  IconCrop,
  IconZoomIn,
  IconZoomOut,
} from "@tabler/icons-react";
import {
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
  useCallback,
  useRef,
  useState,
  useTransition,
} from "react";
import { cropToSquare } from "../lib/crop-image";
import { cn } from "../lib/utils";
import { AOFButton, type AOFButtonPartProps } from "./aof-button";
import {
  AOFDialog,
  AOFDialogContent,
  AOFDialogFooter,
  AOFDialogTitle,
} from "./aof-dialog";

/** The dialog's words, in the page's language. */
export type AOFAvatarCropLabels = {
  cancel: string;
  dialogTitle: string;
  use: string;
  zoomIn: string;
  zoomOut: string;
};

export type AOFAvatarCropDialogProps = {
  open: boolean;
  /** The picture to crop, as an object URL. */
  src: string;
  labels: AOFAvatarCropLabels;
  onCancel: () => void;
  /** The square chosen, drawn at `AVATAR.CROP_SIZE` (`avatar.webp`, or JPEG in Safari). */
  onUse: (file: File) => void;
  /** The title, dressed by the App: a `decoration` after its words. */
  titleProps?:
    | (Omit<ComponentProps<typeof AOFDialogTitle>, "children"> & {
        decoration?: ReactNode;
      })
    | undefined;
  /** Cancel, dressed by the App (variant, class, a `decoration`). */
  cancelProps?: AOFButtonPartProps | undefined;
  /** Use, dressed by the App. */
  useProps?: AOFButtonPartProps | undefined;
  /** Zoom in, an icon button at the top right, dressed by the App. */
  zoomInProps?: AOFButtonPartProps | undefined;
  /** Zoom out, beside it. */
  zoomOutProps?: AOFButtonPartProps | undefined;
};

const START: CropperPoint = { x: 0, y: 0 };
const ZOOM = { MAX: 3, MIN: 1, STEP: 0.5 } as const;

/**
 * Crops a picture to the Avatar's square (DiceUI's Cropper, square frame):
 * drag to frame it, zoom with the two buttons, the wheel or a pinch. Use draws the
 * square in the browser, so only a small file is sent.
 */
export const AOFAvatarCropDialog = ({
  cancelProps: { decoration: cancelDecoration, ...cancelProps } = {},
  labels,
  onCancel,
  onUse,
  open,
  src,
  titleProps: { decoration: titleDecoration, ...titleProps } = {},
  useProps: { decoration: useDecoration, ...useProps } = {},
  zoomInProps: { decoration: zoomInDecoration, ...zoomInProps } = {},
  zoomOutProps: { decoration: zoomOutDecoration, ...zoomOutProps } = {},
}: AOFAvatarCropDialogProps) => {
  const [crop, setCrop] = useState(START);
  const [zoom, setZoom] = useState<number>(ZOOM.MIN);
  const [area, setArea] = useState<CropperAreaData | null>(null);
  const [pending, startTransition] = useTransition();
  // The picture's own shape, which frames it on a phone: square until it loads.
  const [ratio, setRatio] = useState(1);
  const image = useRef<HTMLImageElement>(null);
  // DiceUI hands onLoad a bare Event, with no target: read the image itself.
  const shaped = useCallback(() => {
    if (image.current) {
      setRatio(image.current.naturalWidth / image.current.naturalHeight);
    }
  }, []);
  const zoomBy = useCallback(
    (step: number) =>
      setZoom((now) => Math.min(ZOOM.MAX, Math.max(ZOOM.MIN, now + step))),
    []
  );
  const zoomIn = useCallback(() => zoomBy(ZOOM.STEP), [zoomBy]);
  const zoomOut = useCallback(() => zoomBy(-ZOOM.STEP), [zoomBy]);
  const frame: CSSProperties & Record<"--picture-ratio", number> = {
    "--picture-ratio": ratio,
  };
  const keepArea = useCallback(
    (_: CropperAreaData, pixels: CropperAreaData) => setArea(pixels),
    []
  );
  const closed = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        onCancel();
      }
    },
    [onCancel]
  );
  const use = useCallback(() => {
    const picture = image.current;
    if (!(area && picture)) {
      return;
    }
    // Drawn from the cropper's own image, already decoded.
    startTransition(async () => {
      onUse(await cropToSquare(picture, area, AVATAR.CROP_SIZE, "avatar"));
    });
  }, [area, onUse]);

  return (
    <AOFDialog onOpenChange={closed} open={open}>
      {/* Nearly the whole phone (a 0.5rem margin, a 0.75rem padding); up to
          48rem wide from `sm`, the frame as tall as the screen allows. */}
      <AOFDialogContent
        className="max-w-[calc(100%-1rem)] gap-3 p-3 sm:max-w-3xl sm:gap-4 sm:p-4"
        showCloseButton={false}
        // On the content, not the Cropper, which hands `style` to an inner layer.
        style={frame}
      >
        <div className="flex items-center justify-between gap-2">
          <AOFDialogTitle
            {...titleProps}
            className={cn(
              "flex items-center gap-2 text-lg",
              titleProps.className
            )}
          >
            {labels.dialogTitle}
            {titleDecoration}
          </AOFDialogTitle>
          <div className="flex shrink-0 gap-2">
            <AOFButton
              aria-label={labels.zoomOut}
              disabled={zoom <= ZOOM.MIN}
              onClick={zoomOut}
              size="icon"
              type="button"
              variant="outline"
              {...zoomOutProps}
            >
              {zoomOutDecoration}
              <IconZoomOut aria-hidden />
            </AOFButton>
            <AOFButton
              aria-label={labels.zoomIn}
              disabled={zoom >= ZOOM.MAX}
              onClick={zoomIn}
              size="icon"
              type="button"
              variant="outline"
              {...zoomInProps}
            >
              {zoomInDecoration}
              <IconZoomIn aria-hidden />
            </AOFButton>
          </div>
        </div>
        {/* On a phone the frame takes the picture's shape, so a portrait one
            leaves no bands at its sides, up to 60% of the screen's height;
            from `sm` it is as tall as the screen allows. */}
        <Cropper
          aspectRatio={1}
          className="aspect-(--picture-ratio) max-h-[60svh] w-full rounded-lg sm:aspect-auto sm:h-[min(70svh,36rem)] sm:max-h-none"
          crop={crop}
          maxZoom={ZOOM.MAX}
          minZoom={ZOOM.MIN}
          onCropAreaChange={keepArea}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          shape="rectangle"
          zoom={zoom}
        >
          <CropperImage alt="" onLoad={shaped} ref={image} src={src} />
          <CropperArea />
        </Cropper>
        <AOFDialogFooter className="-mx-3 -mb-3 p-3 sm:-mx-4 sm:-mb-4 sm:p-4">
          <AOFButton
            onClick={onCancel}
            type="button"
            variant="outline"
            {...cancelProps}
          >
            {cancelDecoration}
            <IconArrowBackUp aria-hidden />
            {labels.cancel}
          </AOFButton>
          <AOFButton
            disabled={!area || pending}
            onClick={use}
            type="button"
            {...useProps}
          >
            {useDecoration}
            <IconCrop aria-hidden />
            {labels.use}
          </AOFButton>
        </AOFDialogFooter>
      </AOFDialogContent>
    </AOFDialog>
  );
};
