// @module-tag unit
import {
  COMMON_TEXT_PAIRS,
  describeContrast,
  readTheme,
} from "../../shared/tests/theme-css";

// The LED board and the line's green are Japan's own furniture: their pairs
// stay here, the rest is every Design's (`COMMON_TEXT_PAIRS`).
describeContrast("Japan", readTheme("japan"), [
  ...COMMON_TEXT_PAIRS,
  ["led", "led-panel"],
  // A button filled with the line's colour (the Install hint), labelled in
  // the LED board's black.
  ["led-panel", "line-green"],
  // A chosen option on the line's calmer, deeper green, labelled in white.
  ["line-green-deep-foreground", "line-green-deep"],
]);
