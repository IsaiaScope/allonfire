export type TutorialSfxCue =
  | "soft-whoosh"
  | "paper-tick"
  | "quiet-pop"
  | "ui-click"
  | "page-turn";

export const tutorialSfxFiles: Record<TutorialSfxCue, string> = {
  "soft-whoosh": "sfx/soft-whoosh.wav",
  "paper-tick": "sfx/paper-tick.wav",
  "quiet-pop": "sfx/quiet-pop.wav",
  "ui-click": "sfx/ui-click.wav",
  "page-turn": "sfx/page-turn.wav",
};
