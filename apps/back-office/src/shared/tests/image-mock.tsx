import { useCallback } from "react";

/**
 * ui's `AOFImage` (`@allonfire/ui/shared/components/aof-image`) or next/image as a
 * test renders it: next/image needs Next's loader, and reaches the browser as
 * a CommonJS object, not a component. A `<span>` shows what it was handed:
 * its `alt`, its `src` (through its `loader` when given) and whether the
 * App's optimizer would serve it. A `/broken` picture fails to load, as an
 * expired link would.
 */
export const ImageMock = ({
  alt,
  loader,
  onError,
  src,
  unoptimized,
}: {
  alt?: string;
  loader?: (args: { src: string; width: number }) => string;
  onError?: (event: { currentTarget: HTMLElement }) => void;
  src: string;
  unoptimized?: boolean;
}) => {
  const loaded = useCallback(
    (element: HTMLElement | null) => {
      if (element && src.startsWith("/broken")) {
        onError?.({ currentTarget: element });
      }
    },
    [onError, src]
  );
  return (
    <span
      data-alt={alt}
      data-optimizer={loader || unoptimized ? "none" : "app"}
      data-src={loader ? loader({ src, width: 2048 }) : src}
      data-testid="picture"
      ref={loaded}
    />
  );
};
