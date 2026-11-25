"use client";

import { objectKeys } from "@allonfire/core/shared/utils/object";
import type { ImageBody } from "@allonfire/storage/features/image/constants/schemas";
import { useListTable } from "@allonfire/ui/features/data-table/hooks/use-list-table";
import { useStepBackPastEnd } from "@allonfire/ui/features/data-table/hooks/use-step-back-past-end";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api } from "@/features/api/utils/api";
import { ListTable } from "@/shared/components/list-table";
import { IMAGES } from "../constants/images";
import { useImagesTableState } from "../hooks/use-images-table-state";
import { useSelectableImages } from "../hooks/use-selectable-images";
import { imageRow } from "../utils/image-row";
import { queryOf } from "../utils/images-params";
import { imagesQuery } from "../utils/images-queries";
import { DeleteImages } from "./delete-images";
import { ImagesRowsSkeleton } from "./images-list-skeleton";
import { ImagesNotice } from "./images-notice";
import { ImagesToolbar } from "./images-toolbar";

const NO_IMAGES: ImageBody[] = [];

/** The picture column shares the room a wide screen leaves over. */
const FILL_COLUMNS = ["image", "apps"];

/**
 * The Images list: the toolbar, then one numbered page of Images from the address, read under the
 * key the page prefetched it with, so it opens filled. A new page keeps the
 * previous rows on screen until it arrives. Rows can be selected for
 * deletion and leave the list the moment it is confirmed (`bulkDeleteMutation`); the selection holds only for the
 * page in view (`useImagesTableState`).
 */
export const ImagesTable = () => {
  const t = useTranslations("Images");
  const paginationWords = useTranslations("Images.pagination");
  const tableState = useImagesTableState();
  const { clearSearch, clearSelection, params, selection, stepBackTo } =
    tableState;
  // The API is asked, and the cache keyed, by the query alone: hiding a
  // column asks nothing again.
  const pageQuery = useQuery({
    ...imagesQuery(api, queryOf(params)),
    placeholderData: keepPreviousData,
  });
  // A page past the last one (its Images all deleted, or an edited address)
  // steps back; until it has, the skeleton stands in, not "no Image matches".
  const status = useStepBackPastEnd({
    firstPage: IMAGES.DEFAULT.PAGE,
    page: params[IMAGES.PARAM.PAGE],
    query: pageQuery,
    rows: pageQuery.data?.images.length,
    stepTo: stepBackTo,
  });
  const { card, columns } = useSelectableImages();

  const table = useListTable({
    columns,
    data: pageQuery.data?.images ?? NO_IMAGES,
    enableRowSelection: true,
    getRowId: ({ id }) => id,
    pageCount: pageQuery.data?.pageCount ?? -1,
    state: tableState,
  });

  return (
    <ListTable
      card={card}
      className={imageRow()}
      fill={FILL_COLUMNS}
      label={t("list")}
      pageSizes={IMAGES.PAGE_SIZES}
      states={{
        empty: <ImagesNotice kind="empty" onAction={clearSearch} />,
        error: <ImagesNotice kind="error" onAction={pageQuery.refetch} />,
        loading: <ImagesRowsSkeleton />,
      }}
      status={status}
      table={table}
      words={paginationWords}
    >
      <ImagesToolbar>
        <DeleteImages
          onClear={clearSelection}
          selectedIds={objectKeys(selection)}
        />
      </ImagesToolbar>
    </ListTable>
  );
};
