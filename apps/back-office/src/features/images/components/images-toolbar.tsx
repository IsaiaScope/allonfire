"use client";

import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import { IconPhotoPlus } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";
import { type ReactNode, useCallback } from "react";
import { SearchToolbar } from "@/shared/components/search-toolbar";
import { IMAGES } from "../constants/images";
import { imagesParams } from "../constants/images-params";
import { newImageHref } from "../utils/image-href";
import { ImagesFilters } from "./images-filters";

/**
 * The list's controls (`SearchToolbar`): a search box over the Images'
 * description and file name, then the Filter button (`ImagesFilters`), the
 * actions on the selection (`children`), then the primary way to add an Image.
 */
export const ImagesToolbar = ({ children }: { children?: ReactNode }) => {
  const t = useTranslations("Images");
  const [params, setParams] = useQueryStates(imagesParams);
  // Replaces the history entry, and the page key too, which would otherwise push.
  const write = useCallback(
    (search: string | null) =>
      setParams(
        { [IMAGES.PARAM.PAGE]: null, [IMAGES.PARAM.SEARCH]: search },
        IMAGES.HISTORY.REPLACE
      ),
    [setParams]
  );
  return (
    <SearchToolbar
      add={{
        href: newImageHref(),
        icon: <IconPhotoPlus aria-hidden />,
        kanji: IMAGES.ADD_KANJI,
        label: t("add.button"),
      }}
      clearLabel={t("search.clear")}
      codec={IMAGE.SEARCH}
      Filters={ImagesFilters}
      raw={params[IMAGES.PARAM.SEARCH]}
      searchLabel={t("search.label")}
      typingRestMs={IMAGES.TYPING_REST_MS}
      write={write}
    >
      {children}
    </SearchToolbar>
  );
};
