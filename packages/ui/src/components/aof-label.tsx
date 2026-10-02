import { Label as ShadcnLabel } from "@allonfire/shadcn/components/label";
import type { ComponentProps } from "react";

export type AOFLabelProps = ComponentProps<typeof ShadcnLabel>;

// ponytail: the shadcn Label as-is, like AOFButton.
export const AOFLabel = (props: AOFLabelProps) => <ShadcnLabel {...props} />;
