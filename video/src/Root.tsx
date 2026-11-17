import React from "react";
import { Composition } from "remotion";
import { FPS } from "./theme";
import { Presentation, PRESENTATION_FRAMES } from "./presentation/Presentation";
import { Install, INSTALL_FRAMES } from "./install/Install";

export const Root: React.FC = () => (
  <>
    {(["fr", "en"] as const).map((lang) => (
      <React.Fragment key={lang}>
        <Composition id={`Presentation-${lang}`} component={Presentation} durationInFrames={PRESENTATION_FRAMES} fps={FPS} width={1920} height={1080} defaultProps={{ lang }} />
        <Composition id={`Install-${lang}`} component={Install} durationInFrames={INSTALL_FRAMES} fps={FPS} width={1080} height={1920} defaultProps={{ lang }} />
      </React.Fragment>
    ))}
  </>
);
