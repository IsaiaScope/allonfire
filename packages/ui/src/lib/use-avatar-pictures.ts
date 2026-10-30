import { useCallback, useEffect, useRef, useState } from "react";
import { canDraw } from "./crop-image";
import { heicToJpeg } from "./heic-to-jpeg";

/**
 * The field's own file input, the one the form posts: `holdInInput` puts the
 * cropped square in it, or nothing, without a change event. Not the drop
 * area's input, which DiceUI empties after every pick, refused or cancelled
 * ones too: posting that one lost the square already held.
 */
export const useHeldFile = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const holdInInput = useCallback((file: File | null) => {
    if (!inputRef.current) {
      return;
    }
    const held = new DataTransfer();
    if (file) {
      held.items.add(file);
    }
    inputRef.current.files = held.files;
  }, []);
  return { holdInInput, inputRef };
};

/**
 * An object URL for `file` while it is shown, revoked after: made in the
 * effect that revokes it, so a render React throws away leaks none.
 */
export const useObjectUrl = (file: File | null) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const made = URL.createObjectURL(file);
    setUrl(made);
    return () => URL.revokeObjectURL(made);
  }, [file]);
  return url;
};

/** A picked file, drawable, under the name it was picked with. */
type Picked = { file: File; name: string };

/**
 * The crop dialog's pictures: the original the picture in use was cropped
 * from, with its name, and a new pick held apart until Use, so Cancel leaves
 * the picture in use, its name and its original as they were. `pick` turns
 * an iPhone's HEIC into a JPEG first and answers false for a file it cannot
 * draw, after telling `onUnreadable`.
 */
export const useCropPictures = (onUnreadable: () => void) => {
  const [kept, setKept] = useState<Picked | null>(null);
  const [pending, setPending] = useState<Picked | null>(null);
  const [cropping, setCropping] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const originalUrl = useObjectUrl(kept?.file ?? null);
  const pendingUrl = useObjectUrl(pending?.file ?? null);

  const pick = useCallback(
    async (file: File) => {
      setPreparing(true);
      const drawable = await heicToJpeg(file).catch(() => null);
      setPreparing(false);
      if (!(drawable && (await canDraw(drawable)))) {
        onUnreadable();
        return false;
      }
      setPending({ file: drawable, name: file.name });
      setCropping(true);
      return true;
    },
    [onUnreadable]
  );
  const keep = useCallback(() => {
    setCropping(false);
    if (pending) {
      setKept(pending);
      setPending(null);
    }
  }, [pending]);
  const cancel = useCallback(() => {
    setCropping(false);
    setPending(null);
  }, []);
  const cropAgain = useCallback(() => setCropping(true), []);
  const forget = useCallback(() => setKept(null), []);
  return {
    cancel,
    cropAgain: kept ? cropAgain : null,
    cropping,
    // A new pick waits for its own link, never showing the kept original.
    cropUrl: pending ? pendingUrl : originalUrl,
    forget,
    keep,
    pick,
    pickedName: kept?.name ?? "",
    preparing,
  };
};
