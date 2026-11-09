import { CHART } from "../constants/chart";

/**
 * How tall a bar chart of `rows` rows and `series` bars each is. In a plain
 * module, not in the chart's client file, so a Server Component's skeleton can
 * hold the room the chart will take.
 */
export const barChartHeight = (rows: number, series: number) =>
  rows * (series * CHART.HEIGHT.BAR_PX + CHART.HEIGHT.ROW_GAP_PX) +
  CHART.HEIGHT.CHROME_PX;
