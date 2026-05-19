import type React from "react";
import { AbsoluteFill } from "remotion";
import {
  AccentRule,
  AnimatedInOut,
  CaptionBand,
  DisplayText,
  Kicker,
  LowerThird,
  type OverlayMode,
  OverlayStage,
  PaperPanel,
  ProgressRail,
  SoundCue,
  TargetHighlight,
} from "./tutorial-kit";

export type TutorialShowcaseProps = {
  activeStep: number;
  caption: string;
  code: {
    command: string;
    file: string;
    lines: string[];
  };
  kicker: string;
  lowerThird: {
    eyebrow: string;
    title: string;
  };
  mode: OverlayMode;
  sfxEnabled: boolean;
  title: string;
};

export const TutorialShowcaseOverlay: React.FC<TutorialShowcaseProps> = ({
  activeStep,
  caption,
  code,
  kicker,
  lowerThird,
  mode,
  sfxEnabled,
  title,
}) => {
  return (
    <AbsoluteFill>
      <SoundCue cue="soft-whoosh" enabled={sfxEnabled} from={2} />
      <SoundCue cue="paper-tick" enabled={sfxEnabled} from={28} volume={0.12} />
      <SoundCue cue="ui-click" enabled={sfxEnabled} from={52} volume={0.12} />
      <OverlayStage mode={mode} showRails={false}>
        {mode === "fullscreen" ? (
          <FullScreenShowcase
            activeStep={activeStep}
            caption={caption}
            code={code}
            kicker={kicker}
            title={title}
          />
        ) : (
          <OverVideoShowcase
            activeStep={activeStep}
            caption={caption}
            code={code}
            kicker={kicker}
            lowerThird={lowerThird}
            title={title}
          />
        )}
      </OverlayStage>
    </AbsoluteFill>
  );
};

function FullScreenShowcase({
  activeStep,
  kicker,
  title,
}: Pick<
  TutorialShowcaseProps,
  "activeStep" | "caption" | "code" | "kicker" | "title"
>) {
  return (
    <div className="grid size-full place-items-center">
      <div className="grid w-full max-w-[1120px] gap-12">
        <AnimatedInOut
          className="grid justify-items-center gap-8 text-center"
          delay={0}
        >
          <Kicker>{kicker}</Kicker>
          <DisplayText>{title}</DisplayText>
        </AnimatedInOut>
        <AnimatedInOut delay={8}>
          <PaperPanel
            className="mx-auto grid w-full max-w-[760px] content-center gap-8"
            mode="solid"
          >
            <TargetHighlight className="mx-auto" label="focus" tone="olive" />
            <ProgressRail active={activeStep} total={3} />
          </PaperPanel>
        </AnimatedInOut>
      </div>
    </div>
  );
}

function OverVideoShowcase({
  caption,
  kicker,
  lowerThird,
}: Pick<
  TutorialShowcaseProps,
  "activeStep" | "caption" | "code" | "kicker" | "lowerThird" | "title"
>) {
  return (
    <div className="az-over-video-width grid w-full gap-5">
      <AnimatedInOut delay={0}>
        <LowerThird {...lowerThird} />
      </AnimatedInOut>
      <AnimatedInOut delay={8}>
        <CaptionBand emphasis={kicker}>{caption}</CaptionBand>
      </AnimatedInOut>
      <AnimatedInOut delay={18} kind="wipe">
        <AccentRule />
      </AnimatedInOut>
    </div>
  );
}
