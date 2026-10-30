import type { ComponentPropsWithoutChildren } from "@allonfire/ui/lib/types";
import { cn } from "@allonfire/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const seal = cva(
  "flex shrink-0 -rotate-6 flex-col items-center justify-center rounded-full border-2 border-hanko font-bold font-serif text-hanko leading-none",
  {
    defaultVariants: { size: "md", stamp: true },
    variants: {
      size: {
        md: "size-12 text-sm",
        sm: "size-10 text-xs",
      },
      /** Stamped in once on arrival; `false` shows it pressed already. */
      stamp: {
        false: "",
        true: "motion-safe:animate-stamp",
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
 * it, and stamped in once (unless the visitor asks for reduced motion, or
 * `stamp` is false). Its characters stack top to bottom as on a real seal.
 * Decoration only.
 */
export const Hanko = ({
  className,
  seal: characters,
  size,
  stamp,
  ...props
}: HankoProps) => (
  <span
    aria-hidden
    className={cn(seal({ size, stamp }), className)}
    lang="ja"
    {...props}
  >
    {[...characters].map((character) => (
      <span key={character}>{character}</span>
    ))}
  </span>
);
