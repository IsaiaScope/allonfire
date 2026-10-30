import type { ComponentPropsWithoutChildren } from "@allonfire/ui/lib/types";
import { cn } from "@allonfire/ui/lib/utils";

// ponytail: fixed ids, one torii per page (the header's); a second one
// would share these shapes and gradients, which is harmless.
const ID = {
  BEAM: "torii-beam",
  FOOT: "torii-foot",
  KASAGI: "torii-kasagi",
  NUKI: "torii-nuki",
  POST: "torii-post",
  ROUND: "torii-round",
  SHIMAKI: "torii-shimaki",
} as const;

const url = (id: string) => `url(#${id})`;
const href = (id: string) => `#${id}`;

/**
 * A torii (鳥居), a shrine's gate: the black top
 * beam sweeping up at its ends over the red one, the tie
 * beam, two posts leaning in, black feet. Shaded so the beams read square
 * and the posts round, and muted so it sits in the header without calling
 * for attention. In the dark theme, where black on the night ground would
 * vanish, the black parts take the App's line colour, mixed into the
 * ground so nothing shows through it, edged a shade deeper. Decoration
 * only.
 */
export const Torii = ({
  className,
  ...props
}: ComponentPropsWithoutChildren<"svg">) => (
  <svg
    aria-hidden
    className={cn("h-10 w-12 shrink-0 opacity-75", className)}
    viewBox="0 0 48 40"
    {...props}
  >
    <defs className="text-led-panel">
      {/* Lit from above: a beam darkens toward its underside. */}
      <linearGradient id={ID.BEAM} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0.35" stopColor="currentColor" stopOpacity="0" />
        <stop offset="1" stopColor="currentColor" stopOpacity="0.45" />
      </linearGradient>
      {/* A post is round: lit on its left, in shade on its right. */}
      <linearGradient id={ID.ROUND} x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="currentColor" stopOpacity="0" />
        <stop offset="0.45" stopColor="currentColor" stopOpacity="0.05" />
        <stop offset="1" stopColor="currentColor" stopOpacity="0.5" />
      </linearGradient>
      <path
        d="M0.8 3 Q24 10 47.2 3 L46.6 5.9 Q24 12.4 1.4 5.9 Z"
        id={ID.KASAGI}
      />
      <path
        d="M4 7.4 Q24 12.2 44 7.4 L44 10.6 Q24 15.2 4 10.6 Z"
        id={ID.SHIMAKI}
      />
      <rect height="3" id={ID.NUKI} rx="0.4" width="42" x="3" y="19.5" />
      <path d="M12.4 11.6 L15.6 12.2 L14.6 35.6 L11.2 35.6 Z" id={ID.POST} />
      <rect height="2.4" id={ID.FOOT} rx="0.4" width="5.6" x="10.1" y="35.4" />
    </defs>
    {/* The posts (hashira); the right one mirrors the left. */}
    <g className="fill-hanko">
      <use href={href(ID.POST)} />
      <use href={href(ID.POST)} transform="matrix(-1 0 0 1 48 0)" />
    </g>
    <use fill={url(ID.ROUND)} href={href(ID.POST)} />
    <use
      fill={url(ID.ROUND)}
      href={href(ID.POST)}
      transform="matrix(-1 0 0 1 48 0)"
    />
    {/* The red beam (shimaki) and the tie beam (nuki). */}
    <g className="fill-hanko">
      <use href={href(ID.SHIMAKI)} />
      <use href={href(ID.NUKI)} />
    </g>
    <use fill={url(ID.BEAM)} href={href(ID.SHIMAKI)} />
    <use fill={url(ID.BEAM)} href={href(ID.NUKI)} />
    {/* The black parts: the top beam (kasagi), the feet. */}
    <g className="fill-led-panel dark:fill-[color-mix(in_srgb,var(--line)_70%,var(--background))] dark:stroke-[0.6] dark:stroke-[color-mix(in_srgb,var(--line)_45%,var(--background))]">
      <use href={href(ID.KASAGI)} />
      <use href={href(ID.FOOT)} />
      <use href={href(ID.FOOT)} transform="matrix(-1 0 0 1 48 0)" />
    </g>
  </svg>
);
