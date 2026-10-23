import { Checkbox } from "@allonfire/shadcn/components/checkbox";

// ponytail: shadcn's checkbox under its AOF name; Base UI already draws
// `indeterminate` as aria-checked="mixed". Add behaviour here, never in
// packages/shadcn.
export const AOFCheckbox = Checkbox;
