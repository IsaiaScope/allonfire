// @module-tag unit

import { formatClock, formatTime } from "../format-time";

it.each([
  [0, "0.00"],
  [9, "0.00"],
  [10, "0.01"],
  [1234, "1.23"],
  [19_590, "19.59"],
  [59_999, "59.99"],
  [60_000, "1:00.00"],
  [65_000, "1:05.00"],
  [3_600_000, "60:00.00"],
])("%i ms reads %s", (ms, text) => {
  expect(formatTime(ms)).toBe(text);
});

it.each([
  [0, "0:00.00"],
  [6250, "0:06.25"],
  [19_590, "0:19.59"],
  [65_030, "1:05.03"],
])("the clock at %i ms reads %s", (ms, text) => {
  expect(formatClock(ms)).toBe(text);
});
