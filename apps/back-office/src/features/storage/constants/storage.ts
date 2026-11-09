import { UNIT } from "@allonfire/core/shared/constants/units";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { App, ImageAccess } from "@allonfire/database/enums";
import { barChartHeight } from "@allonfire/ui/features/chart/utils/bar-chart-height";

/** What the Storage overview on Home fixes: how long its numbers are kept. */
export const STORAGE = {
  /** The chart's series key for the Avatars, which no Image access names. */
  AVATARS_KEY: "avatars",
  /**
   * The overview (`storageOverviewHydration`), kept in the visitor's browser
   * (ADR 0028) until an Image change calls `updateTag(TAG)`. Never under five
   * minutes (`stale`): below that Next takes the read for uncached data
   * outside any boundary and a navigation to Home blocks. The API keeps its
   * bucket listing 5 minutes as well, so a copy is read again after that
   * (`revalidate`) and gone after an hour (`expire`).
   */
  CACHE: {
    LIFE: {
      expire: UNIT.SECONDS_PER_HOUR,
      revalidate: 5 * UNIT.SECONDS_PER_MINUTE,
      stale: 5 * UNIT.SECONDS_PER_MINUTE,
    },
    TAG: "storage",
  },
  /** The bars: one colour per access, and one for Avatars, from the Design's chart tokens. */
  CHART_COLOR: {
    AVATARS: "var(--chart-3)",
    [ImageAccess.PRIVATE]: "var(--chart-2)",
    [ImageAccess.PUBLIC]: "var(--chart-1)",
  } as const,
  /** Brushed on the image bucket's card and on the overview while it loads: 写, a photograph. */
  KANJI: { IMAGE: "写" },
  /**
   * The chart's room: a row for each App, three bars a row (public, private,
   * Avatars). The failed and refused cards keep it, so no state moves the page.
   */
  OVERVIEW: { CHART_HEIGHT_PX: barChartHeight(objectValues(App).length, 3) },
  /** Asks once more after a server or network failure; never after the API refused. */
  RETRIES: 1,
} as const;
