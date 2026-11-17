import React from "react";
import { AbsoluteFill, interpolate, Sequence, staticFile, Img, useCurrentFrame, useVideoConfig } from "remotion";
import { c, fonts } from "../theme";
import { dict, type Lang, type T } from "../i18n";
import { Phone } from "../components/Phone";
import { Music } from "../components/Music";
import { Rise, useSpring } from "../components/ui";
import { AlbumsScreen, BandScreen, FeedScreen, LibraryScreen, LogbookScreen, MetronomeScreen, PushBanner } from "./screens";

export const SCENES = [
  { id: "intro", frames: 120 },
  { id: "play", frames: 270 },
  { id: "log", frames: 210 },
  { id: "lib", frames: 270 },
  { id: "albums", frames: 240 },
  { id: "commu", frames: 240 },
  { id: "band", frames: 270 },
  { id: "outro", frames: 180 },
] as const;

export const PRESENTATION_FRAMES = SCENES.reduce((a, s) => a + s.frames, 0);

/** Fondu d'entree et de sortie de chaque scene. */
const SceneFade: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const o = interpolate(frame, [0, 10, durationInFrames - 12, durationInFrames], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

/** Texte a gauche, telephone a droite. */
const Feature: React.FC<{ kicker: string; title: string; body: string; children: React.ReactNode; extra?: React.ReactNode }> = ({
  kicker,
  title,
  body,
  children,
  extra,
}) => {
  const phone = useSpring(4, { damping: 20 });
  const frame = useCurrentFrame();
  // Lent travelling vertical du telephone, pour que l'image vive.
  const drift = interpolate(frame, [0, 270], [10, -10]);
  return (
    <SceneFade>
      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 150px 0 170px", gap: 120 }}>
        <div style={{ flex: 1 }}>
          <Rise delay={8}>
            <div style={{ fontFamily: fonts.mono, fontSize: 26, letterSpacing: 3, textTransform: "uppercase", color: c.primary, marginBottom: 22 }}>{kicker}</div>
          </Rise>
          <Rise delay={14}>
            <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 120, lineHeight: 0.92, textTransform: "uppercase", color: c.foreground }}>{title}</div>
          </Rise>
          <Rise delay={22}>
            <div style={{ fontFamily: fonts.sans, fontSize: 36, lineHeight: 1.4, color: c.mutedFg, marginTop: 34, maxWidth: 760 }}>{body}</div>
          </Rise>
          {extra}
        </div>
        <div style={{ transform: `translateY(${(1 - phone) * 300 + drift}px)`, opacity: phone }}>
          <Phone scale={1.12}>{children}</Phone>
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
};

const Logo: React.FC<{ size: number }> = ({ size }) => (
  <Img src={staticFile("icon.png")} style={{ width: size, height: size, borderRadius: size * 0.22, boxShadow: "0 20px 50px rgba(60,40,20,0.25)" }} />
);

const Intro: React.FC<{ t: T }> = ({ t }) => {
  const logo = useSpring(4, { damping: 12 });
  return (
    <SceneFade>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ transform: `scale(${logo})` }}>
          <Logo size={180} />
        </div>
        <Rise delay={14}>
          <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 190, letterSpacing: 4, textTransform: "uppercase", color: c.foreground, marginTop: 30, lineHeight: 1 }}>
            Ostinara
          </div>
        </Rise>
        <Rise delay={26}>
          <div style={{ fontFamily: fonts.sans, fontSize: 42, color: c.mutedFg, marginTop: 14 }}>{t.tagline}</div>
        </Rise>
        <Rise delay={36}>
          <div style={{ fontFamily: fonts.mono, fontSize: 24, letterSpacing: 3, textTransform: "uppercase", color: c.primary, marginTop: 34 }}>{t.instruments}</div>
        </Rise>
      </AbsoluteFill>
    </SceneFade>
  );
};

const Outro: React.FC<{ t: T }> = ({ t }) => {
  const logo = useSpring(4, { damping: 12 });
  return (
    <SceneFade>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", background: c.dark }}>
        <div style={{ transform: `scale(${logo})` }}>
          <Logo size={150} />
        </div>
        <Rise delay={10}>
          <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 130, textTransform: "uppercase", color: c.darkFg, marginTop: 36, lineHeight: 1, textAlign: "center" }}>
            {t.outroTitle}
          </div>
        </Rise>
        <Rise delay={20}>
          <div style={{ fontFamily: fonts.sans, fontSize: 40, color: "#a79e92", marginTop: 20 }}>{t.outroBody}</div>
        </Rise>
        <Rise delay={30}>
          <div style={{ fontFamily: fonts.mono, fontSize: 46, color: c.primaryLight, marginTop: 44, padding: "16px 34px", border: `2px solid ${c.primaryLight}`, borderRadius: 14 }}>
            ostinara.vercel.app
          </div>
        </Rise>
      </AbsoluteFill>
    </SceneFade>
  );
};

export const Presentation: React.FC<{ lang: Lang }> = ({ lang }) => {
  const t = dict[lang];
  const at = (i: number) => SCENES.slice(0, i).reduce((a, s) => a + s.frames, 0);
  const seq = (i: number, node: React.ReactNode) => (
    <Sequence key={SCENES[i].id} from={at(i)} durationInFrames={SCENES[i].frames} name={SCENES[i].id}>
      {node}
    </Sequence>
  );
  return (
    <AbsoluteFill style={{ background: c.background }}>
      <Music />
      {seq(0, <Intro t={t} />)}
      {seq(1, <Feature kicker={t.playKicker} title={t.playTitle} body={t.playBody}><MetronomeScreen t={t} /></Feature>)}
      {seq(2, <Feature kicker={t.logKicker} title={t.logTitle} body={t.logBody}><LogbookScreen t={t} /></Feature>)}
      {seq(3, <Feature kicker={t.libKicker} title={t.libTitle} body={t.libBody}><LibraryScreen t={t} /></Feature>)}
      {seq(4, <Feature kicker={t.albumsKicker} title={t.albumsTitle} body={t.albumsBody}><AlbumsScreen t={t} /></Feature>)}
      {seq(
        5,
        <Feature kicker={t.commuKicker} title={t.commuTitle} body={t.commuBody}>
          <FeedScreen t={t} />
          <PushBanner t={t} at={150} />
        </Feature>,
      )}
      {seq(6, <Feature kicker={t.bandKicker} title={t.bandTitle} body={t.bandBody}><BandScreen t={t} /></Feature>)}
      {seq(7, <Outro t={t} />)}
    </AbsoluteFill>
  );
};
