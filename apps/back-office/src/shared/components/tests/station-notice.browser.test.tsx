// @module-tag integration
import { render } from "vitest-browser-react";
import { seconds } from "@/shared/tests/computed-style";
import {
  CAN_REDUCE_MOTION,
  withReducedMotion,
} from "@/shared/tests/reduce-motion";
import { StationNotice } from "../station-notice";

const SIGNAGE = { CODE: "404", KANA: "回送", WALL_KANJI: "迷子" };
const HEADING = "Page not found";
const ACTION = "Back";

/** The notice's parts as a visitor sees them rise: the stamp, the words
 *  under it, the action after them, in their column. */
const renderNotice = async ({
  action = true,
  entrance = true,
}: {
  action?: boolean;
  entrance?: boolean;
}) => {
  const screen = await render(
    <StationNotice
      action={action ? <span>{ACTION}</span> : undefined}
      entrance={entrance}
      heading={HEADING}
      signage={SIGNAGE}
    />
  );
  const words = screen
    .getByRole("heading", { level: 1, name: HEADING })
    .element().parentElement;
  const column = words?.parentElement;
  const stamp = column?.firstElementChild;
  if (!(words && column && stamp)) {
    throw new Error("the notice has no stamp and words in a column");
  }
  const actionBox = action
    ? screen.getByText(ACTION, { exact: true }).element().parentElement
    : null;
  return { action: actionBox, column, stamp, words };
};

const animation = (element: Element | null | undefined) => {
  if (!element) {
    throw new Error("the part is missing");
  }
  const { animationDelay, animationName } = getComputedStyle(element);
  return { delay: seconds(animationDelay), name: animationName };
};

describe("StationNotice", () => {
  it("raises the words after the stamp, then the action after the words", async () => {
    const parts = await renderNotice({});
    const [stamp, words, action] = [parts.stamp, parts.words, parts.action].map(
      animation
    );
    for (const part of [stamp, words, action]) {
      expect(part?.name).not.toBe("none");
    }
    expect(words?.delay).toBeGreaterThan(stamp?.delay ?? 0);
    expect(action?.delay).toBeGreaterThan(words?.delay ?? 0);
  });

  it("ends on its words without an action: no empty space under them", async () => {
    const { column, words } = await renderNotice({ action: false });
    // Laid out, not as drawn: the words are still rising in.
    expect(column.offsetTop + column.offsetHeight).toBe(
      words.offsetTop + words.offsetHeight
    );
  });

  it("stands still from the first frame without its entrance: a wait shows it all at once", async () => {
    const parts = await renderNotice({ entrance: false });
    for (const part of [parts.stamp, parts.words, parts.action]) {
      expect(animation(part).name).toBe("none");
    }
  });

  // Only Chromium can be asked for less motion.
  describe.runIf(CAN_REDUCE_MOTION)("asked for less motion", () => {
    it("stands still", async () => {
      // Read while it holds: a computed style is live.
      const names = await withReducedMotion(async () => {
        const parts = await renderNotice({});
        return [parts.stamp, parts.words, parts.action].map(
          (part) => animation(part).name
        );
      });
      expect(names).toEqual(["none", "none", "none"]);
    });
  });
});
