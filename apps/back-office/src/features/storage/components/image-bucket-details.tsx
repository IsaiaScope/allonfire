import type {
  StorageAvatars,
  StorageImages,
} from "../utils/storage-overview-queries";
import { StorageChart } from "./storage-chart";

/** The Images' and Avatars' bytes per App, under the card's totals. */
export const ImageBucketBody = ({
  avatars,
  images,
}: {
  avatars: StorageAvatars;
  images: StorageImages;
}) => <StorageChart avatars={avatars.byApp} images={images.byApp} />;
