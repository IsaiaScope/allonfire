import { cva } from "class-variance-authority";

/**
 * A list card's selection checkbox, a small tile (24px; its hit area still a
 * finger's): empty while not chosen, filled in the destructive red with a
 * bold check once chosen, since choosing a row is choosing what to delete
 * (the check AA on it in both themes).
 * Still Base UI's checkbox underneath, so the keyboard and its name hold.
 */
export const cardCheckbox = cva(
  "size-6 rounded-sm bg-muted data-checked:border-destructive data-checked:bg-destructive data-checked:text-white dark:bg-background dark:data-checked:bg-destructive dark:data-checked:text-background **:data-[slot=checkbox-indicator]:[&>svg]:size-3.5 **:data-[slot=checkbox-indicator]:[&>svg]:stroke-3"
);
