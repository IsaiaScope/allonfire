// Stagger container — wrap around children that should enter sequentially
export const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

// Page sections: fade in + slide up
export const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" as const },
  },
};

// Game hub cards: spring scale-in with bouncy overshoot
export const gameCardVariant = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 20 },
  },
};

// Leaderboard rows: lighter cascading entry
export const leaderboardRow = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: "easeOut" as const },
  },
};

// Quiz: correct answer bounce (multi-keyframe, must use tween not spring)
export const correctBounce = {
  scale: [1, 1.08, 0.96, 1.02, 1],
  transition: { duration: 0.5, ease: "easeOut" as const },
};

// Quiz: wrong answer shake
export const wrongShake = {
  x: [0, -8, 8, -6, 6, -3, 3, 0],
  transition: { duration: 0.4, ease: "easeOut" as const },
};

// List rows: cascade from the left
export const listItemSlide = {
  hidden: { opacity: 0, x: -12 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.25, ease: "easeOut" as const },
  },
};

// Upload grid thumbnails: subtle scale pop
export const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.2, ease: "easeOut" as const },
  },
};
