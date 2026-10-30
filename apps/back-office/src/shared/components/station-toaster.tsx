import {
  type AOFToastBackdrops,
  AOFToaster,
} from "@allonfire/ui/components/aof-toaster";
import type { ComponentProps } from "react";
import { BrushKanji } from "./brush-kanji";

/**
 * Each kind's kanji, as a station would sign it: 済 done (済み), 案 a notice
 * (案内), 注 a caution (注意), 失 a failure (失敗).
 */
const BACKDROPS = {
  error: <BrushKanji kanji="失" placement="toast" />,
  info: <BrushKanji kanji="案" placement="toast" />,
  success: <BrushKanji kanji="済" placement="toast" />,
  warning: <BrushKanji kanji="注" placement="toast" />,
} as const satisfies AOFToastBackdrops;

/** ui's toaster in the Japan Design: a brush kanji behind every notice that
 *  says how something went. */
export const StationToaster = (
  props: Omit<ComponentProps<typeof AOFToaster>, "backdrops">
) => <AOFToaster backdrops={BACKDROPS} {...props} />;
