"use client";

import { objectKeys } from "@allonfire/core/shared/utils/object";
import type { ImageBody } from "@allonfire/storage/features/image/constants/schemas";
import { useAOFTable } from "@allonfire/ui/features/data-table/components/aof-data-table";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api } from "@/features/api/utils/api";
import { ListTable } from "@/shared/components/list-table";
import { IMAGES } from "../constants/images";
import {
  useImagesTableState,
  useStepBackPastEnd,
} from "../hooks/use-images-table-state";
import { useSelectableImages } from "../hooks/use-selectable-images";
import { imageRow } from "../utils/image-row";
import { useImagesBeingDeleted } from "../utils/images-mutations";
import { imagesQuery } from "../utils/images-queries";
import { DeleteImages } from "./delete-images";
import { ImagesRowsSkeleton } from "./images-list-skeleton";
import { ImagesNotice } from "./images-notice";
import { ImagesToolbar } from "./images-toolbar";

const NO_IMAGES: ImageBody[] = [];

/** The picture column shares the room a wide screen leaves over. */
const FILL = ["image", "apps"];

/**
 * The Images list: the toolbar, then one numbered page of Images from the address, read under the
 * key the page prefetched it with, so it opens filled. A new page keeps the
 * previous rows on screen until it arrives. Rows can be selected for
 * deletion and fade while it is on its way; the selection holds only for the
 * page in view (`useImagesTableState`).
 */
export const ImagesTable = () => {
  const t = useTranslations("Images");
  const words = useTranslations("Images.pagination");
  const {
    clearSearch,
    clearSelection,
    onPaginationChange,
    pagination,
    params,
    selection,
    setSelection,
  } = useImagesTableState();
  const list = useQuery({
    ...imagesQuery(api, params),
    placeholderData: keepPreviousData,
  });
  // A previous page's rows kept on screen while the next loads judge nothing.
  useStepBackPastEnd(list.isPlaceholderData ? undefined : list.data?.pageCount);
  const deleting = useImagesBeingDeleted();
  const { card, columns } = useSelectableImages();

  const table = useAOFTable({
    columns,
    data: list.data?.images ?? NO_IMAGES,
    enableRowSelection: true,
    getRowId: ({ id }) => id,
    manualPagination: true,
    onPaginationChange,
    onRowSelectionChange: setSelection,
    pageCount: list.data?.pageCount ?? -1,
    state: { pagination, rowSelection: selection },
  });

  return (
    <ListTable
      card={card}
      className={imageRow()}
      deleting={deleting}
      fill={FILL}
      label={t("list")}
      pageSizes={IMAGES.PAGE_SIZES}
      states={{
        empty: <ImagesNotice kind="empty" onAction={clearSearch} />,
        error: <ImagesNotice kind="error" onAction={list.refetch} />,
        loading: <ImagesRowsSkeleton />,
      }}
      status={list.status}
      table={table}
      words={words}
    >
      <ImagesToolbar>
        <DeleteImages ids={objectKeys(selection)} onClear={clearSelection} />
      </ImagesToolbar>
    </ListTable>
  );
};
