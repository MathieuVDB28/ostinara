import React from "react";
import { Audio, getStaticFiles, interpolate, staticFile, useVideoConfig } from "remotion";

export const MUSIC_FILE = "music.mp3";

/**
 * Musique de fond, si `public/music.mp3` existe (fichier fourni a part,
 * avec les droits qui vont avec). Fondu au debut et a la fin.
 */
export const Music: React.FC<{ startFrom?: number; volume?: number }> = ({ startFrom = 0, volume = 0.7 }) => {
  const { durationInFrames } = useVideoConfig();
  const present = getStaticFiles().some((f) => f.name === MUSIC_FILE);
  if (!present) return null;
  return (
    <Audio
      src={staticFile(MUSIC_FILE)}
      startFrom={startFrom}
      volume={(f) =>
        volume *
        interpolate(f, [0, 20, durationInFrames - 60, durationInFrames - 1], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      }
    />
  );
};
