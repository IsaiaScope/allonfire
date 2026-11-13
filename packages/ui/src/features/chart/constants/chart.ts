/** How the bar chart is measured and drawn. */
export const CHART = {
  /** A bar's thickness, the air between two rows, and the value axis and legend under them. */
  HEIGHT: { BAR_PX: 22, CHROME_PX: 88, ROW_GAP_PX: 32 },
  /** The chart's first measure, before the browser has one. */
  INITIAL_SIZE: { height: 240, width: 480 },
  /** The plot's own edges: nothing to spare beside it on a phone. */
  PHONE_MARGIN: { left: 0, right: 8 },
  /**
   * On a phone the category axis's labels (App names) are turned sideways:
   * the room it keeps is one line of text, not a word's width, and a label
   * sits `LABEL_OFFSET_PX` from the axis's edge.
   */
  TURNED: { AXIS_WIDTH_PX: 28, LABEL_OFFSET_PX: 4 },
  /** Ticks on the value axis: few, so their labels never crowd on a phone. */
  VALUE_TICKS: 3,
} as const;
