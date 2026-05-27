import { Audio } from "@remotion/media";
import { Sequence, staticFile } from "remotion";
import { type TutorialSfxCue, tutorialSfxFiles } from "../lib/sfx";

export type SoundCueProps = {
  cue: TutorialSfxCue;
  enabled?: boolean;
  from?: number;
  volume?: number;
};

export function SoundCue({
  cue,
  enabled = true,
  from = 0,
  volume = 0.18,
}: SoundCueProps) {
  if (!enabled) {
    return null;
  }

  return (
    <Sequence from={from} layout="none">
      <Audio src={staticFile(tutorialSfxFiles[cue])} volume={volume} />
    </Sequence>
  );
}
