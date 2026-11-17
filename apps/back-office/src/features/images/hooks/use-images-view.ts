import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import { useListView } from "@/shared/hooks/use-list-view";
import { IMAGES } from "../constants/images";
import { imagesParams } from "../constants/images-params";

/**
 * The Images list's Sort and View, read from and written to its address
 * (`useListView`): called by its table state, for TanStack, and by its Filter
 * panel, for the Sort and View tabs, both writing the same params.
 */
export const useImagesView = () =>
  useListView({
    codecs: { hide: IMAGES.HIDE, sort: IMAGE.SORT },
    hideable: IMAGES.HIDEABLE,
    parsers: {
      hide: imagesParams[IMAGES.PARAM.HIDE],
      page: imagesParams[IMAGES.PARAM.PAGE],
      sort: imagesParams[IMAGES.PARAM.SORT],
    },
    sortable: IMAGES.SORTABLE,
  });
