/**
 * What the browser computes for `value` (a design token, `var(--hanko)`; a
 * gutter, `var(--gutter-bottom)`) as `property` on the page: a browser test
 * compares an element's look with the token it should wear, never with the
 * class that puts it there.
 */
export const computedValue = (property: string, value: string) => {
  const probe = document.createElement("span");
  probe.style.setProperty(property, value);
  document.body.append(probe);
  const computed = getComputedStyle(probe).getPropertyValue(property);
  probe.remove();
  return computed;
};

// A colour's alpha as a browser writes it: `rgba(…, 0.75)`, `oklab(… / 0.75)`;
// an opaque one has none (`rgb(…)`, `oklab(…)`).
const ALPHA = /^.*(?:\/|rgba\(.*,)\s*([\d.]+)\)$/;

/** How opaque a computed colour paints, from 0 to 1. */
export const colorAlpha = (color: string) =>
  ALPHA.test(color) ? Number(color.replace(ALPHA, "$1")) : 1;

/** A computed time (`0.7s`) in seconds. */
export const seconds = (time: string) => Number.parseFloat(time);
