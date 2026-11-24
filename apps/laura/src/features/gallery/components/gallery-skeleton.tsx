import { ink } from "@allonfire/ui/shared/utils/skeleton-ink";
import { cn } from "@allonfire/ui/shared/utils/utils";
import { useTranslations } from "next-intl";
import { GALLERY } from "../constants/gallery";
import { feedFrame, PhotoCell, PhotoGrid } from "./photo-grid";

/** One tile's place: the same cell and gutter as a photo's, the ratios cycling. */
const tiles = Array.from({ length: GALLERY.SKELETON.TILES }, (_, index) => ({
  id: index,
  ratio: GALLERY.SKELETON.RATIOS[index % GALLERY.SKELETON.RATIOS.length] ?? 1,
}));

/**
 * The Gallery before its first page arrives: the feed's own grid with the
 * same cells, then the place of the "more photos" button (a first page is a
 * full one, so a next page nearly always follows), so the two are as tall (its
 * browser test checks it), then the sentinel's line. Heard as one status; its parts are not read.
 */
export const GalleryFeedSkeleton = () => {
  const t = useTranslations("Gallery");
  return (
    <div aria-busy className={feedFrame()} data-skeleton="gallery">
      <p className="sr-only" role="status">
        {t("loading")}
      </p>
      <PhotoGrid aria-hidden>
        {tiles.map(({ id, ratio }) => (
          <PhotoCell className="p-1" height={ratio} key={id} width={1}>
            <div className={cn(ink({ tone: "faint" }), "size-full")} />
          </PhotoCell>
        ))}
      </PhotoGrid>
      <div aria-hidden className="flex justify-center">
        <div className={cn(ink({ tone: "faint" }), "h-8 w-44 rounded-md")} />
      </div>
      <div aria-hidden className="h-px" />
    </div>
  );
};
