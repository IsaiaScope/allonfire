/**
 * The Iconify prefix of each emoji set Laura draws from. Both are Apache 2.0
 * (SOURCES.md): Noto is the rounded, detailed one, Firefox the flatter, bolder.
 */
export const OCEAN_EMOJI_SET = {
  FXEMOJI: "fxemoji",
  NOTO: "noto",
} as const;

/** An emoji's name in each set. Firefox has no squid, crab, coral and more. */
type SeaEmoji = { NOTO: string; FXEMOJI?: string };

/**
 * One emoji per thing the app shows, by its Iconify name in each set. The App
 * draws it with `filter: var(--emoji-shadow)` so it reads on both grounds. The
 * ship is left out on purpose.
 */
export const OCEAN_SEA_EMOJI = {
  ANCHOR: { FXEMOJI: "anchor", NOTO: "anchor" },
  CAMERA: { FXEMOJI: "camera", NOTO: "camera-with-flash" },
  CARDS: { FXEMOJI: "playingcardblackjoker", NOTO: "joker" },
  CHECK: { NOTO: "check-mark-button" },
  COMPASS: { NOTO: "compass" },
  CORAL: { NOTO: "coral" },
  CRAB: { NOTO: "crab" },
  DIZZY: { FXEMOJI: "dizzy", NOTO: "dizzy" },
  DOLPHIN: { FXEMOJI: "dolphin", NOTO: "dolphin" },
  FISH: { FXEMOJI: "fish", NOTO: "tropical-fish" },
  HOURGLASS: { FXEMOJI: "hourglass", NOTO: "hourglass-not-done" },
  JELLYFISH: { NOTO: "jellyfish" },
  LIGHTHOUSE: { NOTO: "lighthouse" },
  MEDAL: { FXEMOJI: "sportsmedal", NOTO: "1st-place-medal" },
  OCTOPUS: { FXEMOJI: "octopus", NOTO: "octopus" },
  PARTY: { FXEMOJI: "confetti", NOTO: "party-popper" },
  PICTURE: { FXEMOJI: "framewithpicture", NOTO: "framed-picture" },
  SAD: { FXEMOJI: "crying", NOTO: "crying-face" },
  SAILBOAT: { FXEMOJI: "sailboat", NOTO: "sailboat" },
  SEARCH: {
    FXEMOJI: "leftmagnifyingglass",
    NOTO: "magnifying-glass-tilted-left",
  },
  SHARK: { NOTO: "shark" },
  SHELL: { FXEMOJI: "spiralshell", NOTO: "spiral-shell" },
  SLEEP: { FXEMOJI: "zzz", NOTO: "sleeping-face" },
  SPARKLES: { FXEMOJI: "sparkles", NOTO: "sparkles" },
  SQUID: { NOTO: "squid" },
  STAR: { FXEMOJI: "star", NOTO: "star" },
  TROPHY: { FXEMOJI: "trophy", NOTO: "trophy" },
  TURTLE: { FXEMOJI: "turtle", NOTO: "turtle" },
  WARNING: { FXEMOJI: "warningsign", NOTO: "warning" },
  WAVE: { FXEMOJI: "wave", NOTO: "water-wave" },
  WHALE: { FXEMOJI: "whale", NOTO: "whale" },
} as const satisfies Record<string, SeaEmoji>;
