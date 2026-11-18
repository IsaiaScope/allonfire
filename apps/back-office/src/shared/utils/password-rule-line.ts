import { cva } from "class-variance-authority";

const ruleBox = cva(
  "data-checked:border-line data-checked:bg-line data-checked:text-foreground dark:data-checked:bg-line dark:data-checked:text-background"
);
const ruleLabel = cva("peer-data-checked:decoration-line");

/**
 * The Japan Design's met password rule for `AOFPasswordRules`: the line
 * green with near-black ink (the Line Rule). Built from `cva`s, so the
 * classes are never a constant.
 */
export const passwordRuleLine = () => ({
  checkbox: ruleBox(),
  label: ruleLabel(),
});
