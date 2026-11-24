import type { ReactNode } from "react";
import { renderInUi } from "./render-in-ui";

/** As wide as the form's page beside the sidebar, where the fields pair up. */
const WIDE_PX = 900;
/** As narrow as a phone's page, where they stack. */
const NARROW_PX = 360;
/** Between the two: one column, but more room than a phone (a tablet; a narrow window). */
const MID_PX = 520;

/** The widths a skeleton's height is held against the real page's at. */
export const FORM_WIDTHS = [
  ["a wide page", WIDE_PX],
  ["a tablet", MID_PX],
  ["a phone", NARROW_PX],
] as const;

/** The page's body, `width` wide inside the container the Section gives it, as `view` draws it. */
export const heightAtIn = async ({
  messages,
  view,
  width,
}: {
  messages: object;
  view: ReactNode;
  width: number;
}) => {
  const screen = await renderInUi({
    children: (
      <div className="@container" style={{ width }}>
        {view}
      </div>
    ),
    messages,
  });
  // A line wraps differently in the fallback font than in the loaded one: measure once the page's fonts are in.
  await document.fonts.ready;
  return screen.container.firstElementChild?.getBoundingClientRect().height;
};
