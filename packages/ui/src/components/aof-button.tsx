import { Button as ShadcnButton } from "@allonfire/shadcn/components/button";
import type { ComponentProps } from "react";

export type AOFButtonProps = ComponentProps<typeof ShadcnButton>;

// ponytail: AOFButton is the shadcn Button as-is for now. It exists so
// Apps import from @allonfire/ui (ADR 0010); the first customisation from the
// impeccable design pass lands here, not in packages/shadcn.
export const AOFButton = (props: AOFButtonProps) => <ShadcnButton {...props} />;
