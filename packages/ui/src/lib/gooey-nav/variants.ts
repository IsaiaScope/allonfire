import { cva } from "class-variance-authority";

// The fork's classes: the Design's corners, `rounded-lg` for the frame and
// `rounded-md` for each option (upstream drew capsules).

export const navVariants = cva(
  "group/gooey text-(length:--gn-font) relative inline-flex max-w-full leading-[1.2]",
  {
    variants: {
      frame: {
        false: "",
        true: "rounded-lg p-(--gn-pad) backdrop-blur-[20px] backdrop-saturate-[1.6] [background:var(--gn-frame)] [box-shadow:var(--gn-frame-shadow)]",
      },
    },
  }
);

export const listVariants = cva(
  "m-0 flex list-none flex-wrap gap-(--gn-gap) p-0",
  {
    variants: {
      overlay: {
        false: "relative",
        true: "pointer-events-none invisible absolute inset-0 text-(--gn-active-ink) [clip-path:inset(100%)]",
      },
    },
  }
);

export const optionVariants = cva(
  "inline-flex items-center gap-2 whitespace-nowrap rounded-md border-none bg-transparent px-(--gn-x) py-(--gn-y) font-[inherit] font-medium text-[length:inherit] leading-[inherit] no-underline",
  {
    variants: {
      interactive: {
        false: "text-inherit",
        true: "cursor-pointer text-(--gn-muted) transition-colors duration-200 [-webkit-tap-highlight-color:transparent] hover:text-(--gn-ink) focus-visible:outline-(--gn-ink) focus-visible:outline-2 focus-visible:outline-offset-2 group-data-active:text-(--gn-ink) group-not-data-ready/gooey:group-data-active:bg-(--gn-pill) group-not-data-ready/gooey:group-data-active:text-(--gn-active-ink)",
      },
    },
  }
);
