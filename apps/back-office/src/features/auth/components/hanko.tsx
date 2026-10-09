import type { ComponentPropsWithoutChildren } from "@allonfire/ui/lib/types";
import { cn } from "@allonfire/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const seal = cva(
  "flex shrink-0 -rotate-6 flex-col items-center justify-center rounded-full border-2 border-hanko font-bold font-serif text-hanko leading-none motion-safe:animate-stamp",
  {
    defaultVariants: { size: "md" },
    variants: {
      size: {
        md: "size-12 text-sm",
        sm: "size-10 text-xs",
      },
    },
  }
);

export type HankoProps = ComponentPropsWithoutChildren<"span"> &
  VariantProps<typeof seal> & {
    /** The characters pressed into the seal, top to bottom. */
    seal: string;
  };

/**
 * A vermilion name seal (判子), pressed slightly askew the way a hand stamps
 * it, and stamped in once (unless the visitor asks for reduced motion). Its
 * characters stack top to bottom as on a real seal. Decoration only.
 */
export const Hanko = ({
  className,
  seal: characters,
  size,
  ...props
}: HankoProps) => (
  <span
    aria-hidden
    className={cn(seal({ size }), className)}
    lang="ja"
    {...props}
  >
    {[...characters].map((character) => (
      <span key={character}>{character}</span>
    ))}
  </span>
);
