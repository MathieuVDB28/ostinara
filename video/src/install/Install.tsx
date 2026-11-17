import React from "react";
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";
import data from "../data.json";
import { c, fonts } from "../theme";
import { dict, type Lang, type T } from "../i18n";
import { AppScreen, Phone } from "../components/Phone";
import { Music } from "../components/Music";
import { Cover, Icon, Label, Rise, ScreenTitle, SectionHead, Tap, useSpring } from "../components/ui";
import { PushBanner } from "../presentation/screens";
import { AddToHome, HomeScreen, LandingPage, NotifAlert, PageMenu, SafariBar, ShareSheet } from "./ios";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const STEPS = [
  { id: "intro", frames: 100 },
  { id: "safari", frames: 150 },
  { id: "dots", frames: 120 },
  { id: "share", frames: 120 },
  { id: "home", frames: 150 },
  { id: "add", frames: 150 },
  { id: "icon", frames: 150 },
  { id: "notif", frames: 210 },
  { id: "done", frames: 150 },
] as const;

export const INSTALL_FRAMES = STEPS.reduce((a, s) => a + s.frames, 0);
const PHONE_SCALE = 1.4;
const URL = "ostinara.vercel.app";

/** En-tete d'etape : numero, consigne, precision. */
const Header: React.FC<{ n: number; title: string; sub: string; t: T }> = ({ n, title, sub, t }) => (
  <div style={{ position: "absolute", top: 110, left: 90, right: 90, height: 470 }}>
    <Rise delay={0} distance={24}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ fontFamily: fonts.mono, fontSize: 30, letterSpacing: 3, textTransform: "uppercase", color: c.primary }}>
          {t.step} {n}/7
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} style={{ width: 34, height: 6, borderRadius: 3, background: i < n ? c.primary : c.muted }} />
          ))}
        </div>
      </div>
    </Rise>
    <Rise delay={5} distance={24}>
      <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 104, lineHeight: 0.95, textTransform: "uppercase", color: c.foreground, marginTop: 26 }}>
        {title}
      </div>
    </Rise>
    <Rise delay={12} distance={24}>
      <div style={{ fontFamily: fonts.sans, fontSize: 38, lineHeight: 1.35, color: c.mutedFg, marginTop: 24 }}>{sub}</div>
    </Rise>
  </div>
);

/** Le telephone, toujours a la meme place pour que les coupes ne se voient pas. */
const PhoneSlot: React.FC<{ children: React.ReactNode; statusColor?: string; enter?: boolean }> = ({ children, statusColor, enter }) => {
  const p = useSpring(0, { damping: 20 });
  const y = enter ? (1 - p) * 600 : 0;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 40 + (872 * (PHONE_SCALE - 1)) / 2, display: "flex", justifyContent: "center", transform: `translateY(${y}px)` }}>
      <Phone scale={PHONE_SCALE} statusColor={statusColor}>
        {children}
      </Phone>
    </div>
  );
};

const Step: React.FC<{ n: number; title: string; sub: string; t: T; children: React.ReactNode; statusColor?: string; enter?: boolean }> = ({
  n,
  title,
  sub,
  t,
  children,
  statusColor,
  enter,
}) => (
  <AbsoluteFill>
    <Header n={n} title={title} sub={sub} t={t} />
    <PhoneSlot statusColor={statusColor} enter={enter}>
      {children}
    </PhoneSlot>
  </AbsoluteFill>
);

/* Ecran d'accueil de l'app avec l'encart « Activer les rappels ? ». */
const AppHome: React.FC<{ t: T; pressEnable?: boolean; promptGone?: number }> = ({ t, pressEnable, promptGone = 0 }) => (
  <AppScreen tab="home">
    <Label style={{ marginTop: 4 }}>{t.week}</Label>
    <ScreenTitle size={34} style={{ margin: "6px 0 16px" }}>
      {t.greeting} {data.me.username}
    </ScreenTitle>
    <div
      style={{
        border: `1px solid ${c.border}`,
        background: c.card,
        borderRadius: 12,
        padding: 14,
        display: "flex",
        gap: 11,
        marginBottom: 18,
        opacity: 1 - promptGone,
        height: 150 * (1 - promptGone),
        overflow: "hidden",
      }}
    >
      <Icon name="bell" size={20} color={c.primary} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{t.notifPromptTitle}</div>
        <div style={{ fontSize: 12.5, color: c.mutedFg, marginTop: 3, lineHeight: 1.4 }}>{t.notifPromptBody}</div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <div style={{ background: c.primary, color: "#fff", fontWeight: 700, fontSize: 13, padding: "7px 14px", borderRadius: 8, transform: pressEnable ? "scale(0.94)" : "none" }}>
            {t.notifEnable}
          </div>
          <div style={{ fontWeight: 600, fontSize: 13, padding: "7px 10px", color: c.mutedFg }}>{t.notifLater}</div>
        </div>
      </div>
    </div>
    <SectionHead label={t.learning} link={t.library} />
    <div style={{ display: "flex", gap: 0, margin: "0 -18px", paddingLeft: 18 }}>
      {data.learning.slice(0, 4).map((s) => (
        <div key={s.title} style={{ width: 104, flexShrink: 0 }}>
          <Cover src={s.cover} size={104} radius={0} />
          <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6, paddingRight: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</div>
          <div style={{ fontSize: 11, color: c.mutedFg }}>{s.artist}</div>
        </div>
      ))}
    </div>
    <div style={{ marginTop: 20 }}>
      <SectionHead label={t.myReviews} link={t.albums} />
      <div style={{ display: "flex", gap: 8 }}>
        {data.reviews.slice(0, 4).map((r) => (
          <Cover key={r.album} src={r.cover} size={80} />
        ))}
      </div>
    </div>
  </AppScreen>
);

/* ------------------------------------------------------------------ Etapes */

const Intro: React.FC<{ t: T }> = ({ t }) => {
  const logo = useSpring(2, { damping: 12 });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 90 }}>
      <div style={{ transform: `scale(${logo})` }}>
        <Cover src="icon.png" size={260} radius={58} style={{ boxShadow: "0 24px 60px rgba(60,40,20,0.3)" }} />
      </div>
      <Rise delay={10}>
        <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 120, lineHeight: 0.95, textTransform: "uppercase", textAlign: "center", marginTop: 60, color: c.foreground }}>
          {t.installTitle}
        </div>
      </Rise>
      <Rise delay={20}>
        <div style={{ fontFamily: fonts.sans, fontSize: 42, lineHeight: 1.35, textAlign: "center", color: c.mutedFg, marginTop: 34 }}>{t.installSub}</div>
      </Rise>
    </AbsoluteFill>
  );
};

const S1: React.FC<{ t: T }> = ({ t }) => {
  const frame = useCurrentFrame();
  const typed = Math.round(interpolate(frame, [20, 70], [0, URL.length], clamp));
  const loaded = interpolate(frame, [82, 100], [0, 1], clamp);
  return (
    <Step n={1} title={t.s1} sub={t.s1b} t={t} enter>
      <div style={{ flex: 1, background: "#fff", position: "relative", display: "flex" }}>
        {loaded > 0 ? <LandingPage t={t} loaded={loaded} /> : null}
        <SafariBar url={URL.slice(0, typed)} cursor={frame < 78} focus={frame < 78} />
      </div>
    </Step>
  );
};

const S2: React.FC<{ t: T }> = ({ t }) => {
  const frame = useCurrentFrame();
  return (
    <Step n={2} title={t.s2} sub={t.s2b} t={t}>
      <div style={{ flex: 1, position: "relative", display: "flex" }}>
        <LandingPage t={t} />
        <SafariBar url={URL} />
        <Tap x={352} y={710} at={45} />
        {frame >= 52 ? <PageMenu t={t} at={52} /> : null}
      </div>
    </Step>
  );
};

const S3: React.FC<{ t: T }> = ({ t }) => {
  const frame = useCurrentFrame();
  return (
    <Step n={3} title={t.s3} sub={t.s3b} t={t}>
      <div style={{ flex: 1, position: "relative", display: "flex" }}>
        <LandingPage t={t} />
        <SafariBar url={URL} />
        <PageMenu t={t} at={-30} highlight={frame >= 40} />
        <Tap x={250} y={421} at={40} />
      </div>
    </Step>
  );
};

const S4: React.FC<{ t: T }> = ({ t }) => {
  const frame = useCurrentFrame();
  const scroll = interpolate(frame, [30, 60], [0, 40], clamp);
  return (
    <Step n={4} title={t.s4} sub={t.s4b} t={t}>
      <div style={{ flex: 1, position: "relative", display: "flex" }}>
        <LandingPage t={t} />
        <SafariBar url={URL} />
        <ShareSheet t={t} at={0} scroll={scroll} highlight={frame >= 90} />
        <Tap x={200} y={630} at={90} />
      </div>
    </Step>
  );
};

const S5: React.FC<{ t: T }> = ({ t }) => {
  const frame = useCurrentFrame();
  const glow = interpolate(frame, [30, 45, 70, 85], [0, 1, 1, 0], clamp);
  return (
    <Step n={5} title={t.s5} sub={t.s5b} t={t}>
      <div style={{ flex: 1, position: "relative", display: "flex" }}>
        <LandingPage t={t} />
        <AddToHome t={t} at={0} glowToggle={glow} pressAdd={frame >= 105} />
        <Tap x={348} y={34} at={105} />
      </div>
    </Step>
  );
};

const S6: React.FC<{ t: T }> = ({ t }) => (
  <Step n={6} title={t.s6} sub={t.s6b} t={t} statusColor="#fff">
    <div style={{ flex: 1, position: "relative" }}>
      <HomeScreen iconAt={15} pressAt={95} />
      <Tap x={330} y={389} at={95} color="rgba(255,255,255,0.4)" />
    </div>
  </Step>
);

const S7: React.FC<{ t: T }> = ({ t }) => {
  const frame = useCurrentFrame();
  const gone = interpolate(frame, [150, 165], [0, 1], clamp);
  return (
    <Step n={7} title={t.s7} sub={t.s7b} t={t}>
      <div style={{ flex: 1, position: "relative", display: "flex" }}>
        <AppHome t={t} pressEnable={frame >= 40 && frame < 50} promptGone={gone} />
        <Tap x={92} y={166} at={40} />
        {frame >= 52 && frame < 150 ? <NotifAlert t={t} at={52} pressAllow={frame >= 120} /> : null}
        <Tap x={270} y={428} at={120} />
      </div>
    </Step>
  );
};

const Done: React.FC<{ t: T }> = ({ t }) => (
  <AbsoluteFill>
    <div style={{ position: "absolute", top: 110, left: 90, right: 90 }}>
      <Rise>
        <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 150, lineHeight: 0.95, textTransform: "uppercase", color: c.primary }}>{t.doneTitle}</div>
      </Rise>
      <Rise delay={8}>
        <div style={{ fontFamily: fonts.sans, fontSize: 40, lineHeight: 1.35, color: c.mutedFg, marginTop: 24 }}>{t.doneBody}</div>
      </Rise>
    </div>
    <PhoneSlot>
      <div style={{ flex: 1, position: "relative", display: "flex" }}>
        <AppHome t={t} promptGone={1} />
        <PushBanner t={t} at={25} />
      </div>
    </PhoneSlot>
  </AbsoluteFill>
);

export const Install: React.FC<{ lang: Lang }> = ({ lang }) => {
  const t = dict[lang];
  const at = (i: number) => STEPS.slice(0, i).reduce((a, s) => a + s.frames, 0);
  const nodes = [<Intro t={t} />, <S1 t={t} />, <S2 t={t} />, <S3 t={t} />, <S4 t={t} />, <S5 t={t} />, <S6 t={t} />, <S7 t={t} />, <Done t={t} />];
  return (
    <AbsoluteFill style={{ background: c.background }}>
      <Music volume={0.5} />
      {nodes.map((node, i) => (
        <Sequence key={STEPS[i].id} from={at(i)} durationInFrames={STEPS[i].frames} name={STEPS[i].id}>
          {node}
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
