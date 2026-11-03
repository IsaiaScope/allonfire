import { Input as ShadcnInput } from "@allonfire/shadcn/components/input";
import type { ComponentProps } from "react";

export type AOFInputProps = ComponentProps<typeof ShadcnInput>;

// ponytail: shadcn's Input under an AOF name, like AOFCard; a Design styles
// it through its tokens and the component using it sizes it.
export const AOFInput = ShadcnInput;
