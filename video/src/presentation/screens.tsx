import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import data from "../data.json";
import { c, fonts } from "../theme";
import type { T } from "../i18n";
import { AppScreen } from "../components/Phone";
import { Avatar, Cover, Icon, Label, ScreenTitle, SectionHead, Ticks, useRamp, useSpring } from "../components/ui";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const Pills: React.FC<{ items: string[]; active: number; dark?: boolean }> = ({ items, active, dark }) => (
  <div style={{ display: "flex", gap: 6, marginBottom: 14, overflow: "hidden" }}>
    {items.map((it, i) => (
      <div
        key={it}
        style={{
          padding: "7px 13px",
          borderRadius: 18,
          fontSize: 13,
          fontWeight: 600,
          whiteSpace: "nowrap",
          background: i === active ? (dark ? c.foreground : c.muted) : dark ? c.secondary : "transparent",
          color: i === active && dark ? c.background : c.foreground,
        }}
      >
        {it}
      </div>
    ))}
  </div>
);

const Underline: React.FC<{ items: string[]; active: number }> = ({ items, active }) => (
  <div style={{ display: "flex", gap: 20, borderBottom: `1px solid ${c.border}`, margin: "0 -18px 18px", padding: "0 18px" }}>
    {items.map((it, i) => (
      <div
        key={it}
        style={{
          paddingBottom: 9,
          fontSize: 14,
          fontWeight: 600,
          color: i === active ? c.foreground : c.mutedFg,
          borderBottom: i === active ? `2px solid ${c.foreground}` : "2px solid transparent",
        }}
      >
        {it}
      </div>
    ))}
  </div>
);

/* ------------------------------------------------------------------ Jouer */

export const MetronomeScreen: React.FC<{ t: T }> = ({ t }) => {
  const frame = useCurrentFrame();
  // 120 BPM a 30 images/s : un temps toutes les 15 images. Demarre a l'image 40.
  const start = 40;
  const playing = frame >= start;
  const beat = playing ? Math.floor((frame - start) / 15) % 4 : -1;
  const inBeat = playing ? ((frame - start) % 15) / 15 : 1;
  const pulse = playing ? interpolate(inBeat, [0, 0.35], [1.06, 1], clamp) : 1;
  const secs = playing ? Math.floor((frame - start) / 30) + 754 : 754;
  const chrono = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
  const btn = useSpring(start - 8);
  return (
    <AppScreen tab="play">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <ScreenTitle>{t.play}</ScreenTitle>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            border: `1px solid ${c.border}`,
            borderRadius: 20,
            padding: "7px 12px",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <Icon name="gauge" size={15} /> {t.tune}
        </div>
      </div>
      <Underline items={[t.logbook, t.session, t.songs, t.exercises]} active={1} />
      {/* Morceau en cours + chrono */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <Cover src={data.learning[0].cover} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {data.learning[0].title}
          </div>
          <div style={{ fontSize: 12, color: c.mutedFg }}>{data.learning[0].artist}</div>
        </div>
        <div style={{ fontFamily: fonts.mono, fontSize: 20, fontWeight: 500, color: playing ? c.primary : c.foreground }}>{chrono}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, marginTop: 6 }}>
        <div style={{ width: 42, height: 42, borderRadius: 21, border: `1px solid ${c.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="minus" size={18} />
        </div>
        <div
          style={{
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: 112,
            lineHeight: 1,
            transform: `scale(${pulse})`,
            color: c.foreground,
          }}
        >
          120
        </div>
        <div style={{ width: 42, height: 42, borderRadius: 21, border: `1px solid ${c.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="plus" size={18} />
        </div>
      </div>
      <Label style={{ textAlign: "center", marginTop: 6 }}>BPM</Label>
      <div style={{ display: "flex", justifyContent: "center", gap: 26, margin: "22px 0 10px" }}>
        {[0, 1, 2, 3].map((i) => {
          const on = i === beat;
          const s = on ? interpolate(inBeat, [0, 0.4], [1.5, 1], clamp) : 1;
          return (
            <div
              key={i}
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                background: on ? c.primary : c.muted,
                border: i === 0 ? `2px solid ${c.primary}` : "none",
                transform: `scale(${s})`,
              }}
            />
          );
        })}
      </div>
      <div style={{ textAlign: "center", fontSize: 12, color: c.mutedFg, marginBottom: 22 }}>{t.tapHint}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: `1px solid ${c.border}`, borderBottom: `1px solid ${c.border}` }}>
        <div style={{ padding: "12px 4px", borderRight: `1px solid ${c.border}` }}>
          <Label style={{ fontSize: 10 }}>{t.measure}</Label>
          <div style={{ fontWeight: 700, fontSize: 15, marginTop: 4 }}>4/4</div>
        </div>
        <div style={{ padding: "12px 14px" }}>
          <Label style={{ fontSize: 10 }}>{t.subdivision}</Label>
          <div style={{ fontWeight: 700, fontSize: 15, marginTop: 4 }}>{t.none}</div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: 26 }}>
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: 38,
            background: c.primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${1 + (playing ? 0.04 * (1 - inBeat) : 0) - 0.12 * (1 - btn) * (frame < start ? 0 : 0)})`,
            boxShadow: playing ? `0 0 0 ${8 * (1 - inBeat)}px rgba(138,82,20,0.18)` : "none",
          }}
        >
          {playing ? (
            <div style={{ display: "flex", gap: 7 }}>
              <div style={{ width: 7, height: 26, borderRadius: 2, background: "#fff" }} />
              <div style={{ width: 7, height: 26, borderRadius: 2, background: "#fff" }} />
            </div>
          ) : (
            <Icon name="triangle" size={34} color="#fff" />
          )}
        </div>
      </div>
    </AppScreen>
  );
};

/* ------------------------------------------------------------------ Carnet */

const WEEKS = 15;
const END = new Date("2026-11-15T12:00:00Z"); // dimanche, derniere colonne

const heatCells = () => {
  const days = data.days as Record<string, number>;
  const cells: { minutes: number; col: number; row: number }[] = [];
  // Colonne 0 = la semaine la plus ancienne ; ligne 0 = lundi.
  for (let col = 0; col < WEEKS; col++) {
    for (let row = 0; row < 7; row++) {
      const back = (WEEKS - 1 - col) * 7 + (6 - row);
      const d = new Date(END.getTime() - back * 86400000);
      cells.push({ minutes: days[d.toISOString().slice(0, 10)] ?? 0, col, row });
    }
  }
  return cells;
};

const heatColor = (m: number) => {
  if (m === 0) return c.muted;
  if (m < 30) return "#d9bf9c";
  if (m < 60) return "#c49a6c";
  if (m < 100) return "#a9783f";
  return c.primary;
};

export const LogbookScreen: React.FC<{ t: T }> = ({ t }) => {
  const frame = useCurrentFrame();
  const count = useRamp(10, 60);
  const minutes = Math.round(data.stats.minutes * count);
  const cells = heatCells();
  return (
    <AppScreen tab="play">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <ScreenTitle>{t.play}</ScreenTitle>
      </div>
      <Underline items={[t.logbook, t.session, t.songs, t.exercises]} active={0} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 1fr", marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 38, lineHeight: 1 }}>{Math.round(data.stats.sessions * count)}</div>
          <Label style={{ fontSize: 10, marginTop: 4 }}>{t.sessionsLabel}</Label>
        </div>
        <div>
          <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 38, lineHeight: 1 }}>
            {Math.floor(minutes / 60)}
            <span style={{ fontSize: 20 }}>h</span>
            {String(minutes % 60).padStart(2, "0")}
          </div>
          <Label style={{ fontSize: 10, marginTop: 4 }}>{t.total}</Label>
        </div>
        <div>
          <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 38, lineHeight: 1 }}>
            {Math.round(data.stats.record * count)}
            <span style={{ fontSize: 20 }}>{t.dayUnit}</span>
          </div>
          <Label style={{ fontSize: 10, marginTop: 4 }}>{t.streak}</Label>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${WEEKS}, 1fr)`, gridAutoFlow: "column", gridTemplateRows: "repeat(7, 1fr)", gap: 3 }}>
        {cells.map((cell, i) => {
          const appear = interpolate(frame, [20 + cell.col * 3, 30 + cell.col * 3], [0, 1], clamp);
          return (
            <div
              key={i}
              style={{
                aspectRatio: "1",
                borderRadius: 3,
                background: cell.minutes ? heatColor(cell.minutes) : c.muted,
                opacity: cell.minutes ? appear : 0.4 + 0.6 * appear,
                transform: `scale(${cell.minutes ? 0.6 + 0.4 * appear : 1})`,
              }}
            />
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, paddingRight: 30 }}>
        {t.months.map((m) => (
          <Label key={m} style={{ fontSize: 10, textTransform: "none" }}>
            {m}
          </Label>
        ))}
      </div>
      <div style={{ borderTop: `1px solid ${c.border}`, marginTop: 20, paddingTop: 16 }}>
        <Label style={{ marginBottom: 12 }}>{t.learning}</Label>
        {data.learning.slice(0, 4).map((s, i) => {
          const p = interpolate(frame, [50 + i * 8, 90 + i * 8], [0, s.progress / 100], clamp);
          return (
            <div key={s.title} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 11 }}>
              <Cover src={s.cover} size={38} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</div>
                <div style={{ fontSize: 11, color: c.mutedFg }}>{s.artist}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 16 }}>
                  {Math.round((p * s.target))}
                  <span style={{ color: c.mutedFg, fontSize: 12 }}>/{s.target}</span>
                </div>
                <Ticks value={p} width={70} />
              </div>
            </div>
          );
        })}
      </div>
    </AppScreen>
  );
};

/* ------------------------------------------------------------------ Biblio */

const Shelf: React.FC<{ title: string; count: number; songs: typeof data.learning; delay: number; t: T; showProgress?: boolean }> = ({
  title,
  count,
  songs,
  delay,
  t,
  showProgress,
}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>
          {title} <span style={{ color: c.mutedFg, fontWeight: 600 }}>· {count}</span>
        </div>
        <div style={{ width: 28, height: 28, borderRadius: 14, border: `1px solid ${c.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>›</div>
      </div>
      <div style={{ display: "flex", gap: 0, margin: "0 -18px", paddingLeft: 18 }}>
        {songs.map((s, i) => {
          const a = interpolate(frame, [delay + i * 4, delay + 14 + i * 4], [0, 1], clamp);
          return (
            <div key={s.title} style={{ width: 104, flexShrink: 0, opacity: a, transform: `translateX(${(1 - a) * 40}px)` }}>
              <Cover src={s.cover} size={104} radius={0} />
              <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6, paddingRight: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {s.title}
              </div>
              <div style={{ fontSize: 11, color: c.mutedFg, paddingRight: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {showProgress ? (
                  <>
                    <span style={{ color: c.primary, fontWeight: 700 }}>
                      {Math.round((s.target * s.progress) / 100)}/{s.target}
                    </span>{" "}
                    {s.capo ? `${t.capo} ${s.capo}` : s.tuning === "Standard" ? t.standard : s.tuning}
                  </>
                ) : (
                  s.artist
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const LibraryScreen: React.FC<{ t: T }> = ({ t }) => {
  const scroll = useRamp(150, 230, 0, 150);
  return (
    <AppScreen tab="library" scrollY={scroll}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 26, fontWeight: 700 }}>{t.library}</div>
        <Icon name="search" size={20} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", border: `1px solid ${c.border}`, borderRadius: 10, padding: 3, marginBottom: 14 }}>
        {[t.songs, t.albums, t.covers].map((x, i) => (
          <div key={x} style={{ textAlign: "center", padding: "8px 0", borderRadius: 8, fontSize: 13, fontWeight: 600, background: i === 0 ? c.muted : "transparent", color: i === 0 ? c.foreground : c.mutedFg }}>
            {x}
          </div>
        ))}
      </div>
      <Pills items={[`${t.all} ${data.stats.songsTotal}`, "Rammstein 5", "Metallica 4", "Linkin Park 2"]} active={0} />
      <Shelf title={t.learning} count={data.stats.learningCount} songs={data.learning} delay={8} t={t} showProgress />
      <Shelf title={t.toLearn} count={data.stats.wantCount} songs={data.want} delay={40} t={t} />
      <Shelf title={t.mastered} count={data.stats.masteredCount} songs={data.mastered} delay={70} t={t} />
    </AppScreen>
  );
};

/* ------------------------------------------------------------------ Albums */

export const AlbumsScreen: React.FC<{ t: T }> = ({ t }) => {
  const frame = useCurrentFrame();
  const r = data.reviews;
  const card = useSpring(95);
  return (
    <AppScreen tab="library">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 26, fontWeight: 700 }}>{t.library}</div>
        <Icon name="search" size={20} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", border: `1px solid ${c.border}`, borderRadius: 10, padding: 3, marginBottom: 16 }}>
        {[t.songs, t.albums, t.covers].map((x, i) => (
          <div key={x} style={{ textAlign: "center", padding: "8px 0", borderRadius: 8, fontSize: 13, fontWeight: 600, background: i === 1 ? c.muted : "transparent", color: i === 1 ? c.foreground : c.mutedFg }}>
            {x}
          </div>
        ))}
      </div>
      <SectionHead label={t.myReviews} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {r.map((a, i) => {
          const s = interpolate(frame, [8 + i * 6, 22 + i * 6], [0, 1], clamp);
          return (
            <div key={a.album} style={{ opacity: s, transform: `scale(${0.85 + 0.15 * s})` }}>
              <div style={{ position: "relative" }}>
                <Cover src={a.cover} size={110} radius={4} />
                <div
                  style={{
                    position: "absolute",
                    right: 5,
                    bottom: 5,
                    background: a.rating >= 9 ? c.primary : "rgba(28,26,23,0.85)",
                    color: "#fff",
                    fontFamily: fonts.display,
                    fontWeight: 800,
                    fontSize: 17,
                    padding: "1px 7px",
                    borderRadius: 4,
                  }}
                >
                  {a.rating}
                  <span style={{ fontSize: 11, opacity: 0.8 }}>/10</span>
                </div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, marginTop: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.album}</div>
              <div style={{ fontSize: 10, color: c.mutedFg }}>{a.artist}</div>
            </div>
          );
        })}
      </div>
      {/* Avis deplie */}
      <div
        style={{
          marginTop: 16,
          background: c.card,
          border: `1px solid ${c.border}`,
          borderRadius: 12,
          padding: 14,
          display: "flex",
          gap: 12,
          opacity: card,
          transform: `translateY(${(1 - card) * 30}px)`,
        }}
      >
        <Cover src={r[2].cover} size={56} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{r[2].album}</div>
            <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 18, color: c.primary }}>{r[2].rating}/10</div>
          </div>
          <div style={{ fontFamily: fonts.serif, fontStyle: "italic", fontSize: 12.5, lineHeight: 1.45, color: c.mutedFg, marginTop: 4 }}>
            « {(r[2].review ?? "").split(".")[0]}. »
          </div>
        </div>
      </div>
    </AppScreen>
  );
};

/* ------------------------------------------------------------------ Commu */

const FeedHead: React.FC<{ avatar: string | null; name: string; action: string; ago: string }> = ({ avatar, name, action, ago }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
    <Avatar src={avatar} size={30} />
    <div style={{ flex: 1, fontSize: 12.5, color: c.mutedFg }}>
      <span style={{ fontWeight: 700, color: c.foreground }}>{name}</span> {action}
    </div>
    <div style={{ fontSize: 11, color: c.mutedFg }}>{ago}</div>
  </div>
);

export const FeedScreen: React.FC<{ t: T }> = ({ t }) => {
  const frame = useCurrentFrame();
  const f = data.feed.friendReview;
  const scroll = useRamp(135, 215, 0, 190);
  const react = useSpring(70, { damping: 10 });
  return (
    <AppScreen tab="commu" scrollY={scroll}>
      <ScreenTitle style={{ marginBottom: 12 }}>{t.commu}</ScreenTitle>
      <Pills items={[t.feed, "Blog", "Forum", t.covers, t.albums, t.friends]} active={0} dark />
      <div style={{ borderTop: `1px solid ${c.border}`, margin: "0 -18px", padding: "14px 18px 0" }}>
        <FeedHead avatar={data.friend.avatar} name={data.friend.display} action={t.reviewedAlbum} ago={t.ago5d} />
        <div style={{ display: "flex", gap: 12 }}>
          <Cover src={f.cover} size={110} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 26, textTransform: "uppercase", lineHeight: 1 }}>{f.album}</div>
            <div style={{ fontSize: 12, color: c.mutedFg, marginBottom: 6 }}>{f.artist}</div>
            <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 22, color: c.primary }}>{f.rating}/10</div>
            <div style={{ fontSize: 11, color: c.mutedFg, marginTop: 4 }}>
              {t.favTracks} : {f.tracks.join(", ")}
            </div>
          </div>
        </div>
        <div style={{ fontFamily: fonts.serif, fontStyle: "italic", fontSize: 12.5, lineHeight: 1.45, color: c.mutedFg, marginTop: 10 }}>
          « {f.review.slice(0, 150)}… »
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "12px 0 14px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 10px",
              borderRadius: 14,
              background: react > 0.05 ? c.secondary : "transparent",
              border: `1px solid ${react > 0.05 ? c.primary : c.border}`,
              transform: `scale(${0.7 + 0.3 * react})`,
              opacity: Math.max(0.0001, react),
              fontSize: 14,
            }}
          >
            🔥 <span style={{ fontSize: 12, fontWeight: 700 }}>1</span>
          </div>
          <Icon name="smile" size={20} color={c.mutedFg} />
          <div style={{ fontSize: 12.5, color: c.mutedFg, marginLeft: 6 }}>{t.comment}</div>
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${c.border}`, margin: "0 -18px", padding: "14px 0 0" }}>
        <div style={{ padding: "0 18px" }}>
          <FeedHead avatar={data.me.avatar} name={t.you} action={t.masteredSong} ago={t.ago3h} />
        </div>
        <div style={{ position: "relative", height: 300, overflow: "hidden" }}>
          <Cover src={data.mastered[0].cover} size={390} radius={0} style={{ position: "absolute", top: -40 }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 45%, rgba(0,0,0,0.75))" }} />
          <div style={{ position: "absolute", left: 18, bottom: 16, color: "#fff" }}>
            <Label style={{ color: "rgba(255,255,255,0.85)", fontSize: 10 }}>{t.masteredAt}</Label>
            <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 34, textTransform: "uppercase", lineHeight: 1 }}>{data.mastered[0].title}</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>{data.mastered[0].artist} · 140 BPM</div>
          </div>
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${c.border}`, margin: "14px -18px 0", padding: "14px 18px 0" }}>
        <FeedHead avatar={data.friend.avatar} name={data.friend.display} action={`${t.playedSession} ${data.feed.friendSession.minutes} ${t.min}`} ago={t.ago6d} />
        <div style={{ fontSize: 13 }}>
          <span style={{ color: c.mutedFg }}>{t.goal} :</span> {data.feed.friendSession.goal}
        </div>
      </div>
    </AppScreen>
  );
};

/** Notification push iOS qui descend en haut de l'ecran. */
export const PushBanner: React.FC<{ t: T; at: number }> = ({ t, at }) => {
  const frame = useCurrentFrame();
  const inP = useSpring(at, { damping: 14 });
  const out = interpolate(frame, [at + 75, at + 90], [0, 1], clamp);
  const y = -140 + 196 * inP - 200 * out;
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 10,
        right: 10,
        transform: `translateY(${y}px)`,
        background: "rgba(245,242,238,0.92)",
        backdropFilter: "blur(20px)",
        borderRadius: 22,
        padding: "12px 14px",
        display: "flex",
        gap: 11,
        alignItems: "center",
        boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
        zIndex: 90,
        fontFamily: fonts.ios,
      }}
    >
      <div style={{ width: 38, height: 38, borderRadius: 9, overflow: "hidden", flexShrink: 0 }}>
        <Cover src="icon.png" size={38} radius={9} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{t.notifTitle}</div>
          <div style={{ fontSize: 12, color: "#777" }}>{t.now}</div>
        </div>
        <div style={{ fontSize: 13.5, color: "#333" }}>{t.notifBody}</div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ Groupe */

export const BandScreen: React.FC<{ t: T }> = ({ t }) => {
  const frame = useCurrentFrame();
  const b = data.band;
  const songs = b.setlist.items;
  return (
    <AppScreen tab="commu">
      <div style={{ fontSize: 13, color: c.mutedFg, marginBottom: 14 }}>‹ {t.groups}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
        <div style={{ width: 64, height: 64, background: c.muted, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fonts.display, fontWeight: 800, fontSize: 24 }}>CB</div>
        <ScreenTitle size={42}>{b.name}</ScreenTitle>
      </div>
      <div style={{ fontFamily: fonts.serif, fontStyle: "italic", fontSize: 14, color: c.mutedFg, marginBottom: 14 }}>{b.tagline}</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 18, overflow: "hidden" }}>
        {[
          ["check", t.logRehearsal],
          ["chat", t.chat],
          ["note", t.jam],
        ].map(([ic, l]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 5, border: `1px solid ${c.border}`, borderRadius: 18, padding: "7px 11px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
            <Icon name={ic} size={14} /> {l}
          </div>
        ))}
      </div>
      <SectionHead label={`${t.concert} · ${t.dateSetlist}`} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <ScreenTitle size={24} style={{ flex: 1 }}>
          {b.setlist.name}
        </ScreenTitle>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, color: c.mutedFg }}>
          <Icon name="pin" size={13} color={c.mutedFg} /> {b.setlist.city}
        </div>
      </div>
      {songs.map((s, i) => {
        const a = interpolate(frame, [20 + i * 7, 34 + i * 7], [0, 1], clamp);
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "7px 0",
              borderBottom: `1px solid ${c.border}`,
              opacity: a,
              transform: `translateX(${(1 - a) * 30}px)`,
            }}
          >
            <div style={{ fontFamily: fonts.mono, fontSize: 11, color: c.mutedFg, width: 16 }}>{i + 1}</div>
            {"title" in s ? (
              <>
                <Cover src={s.cover ?? null} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{s.title}</div>
                  <div style={{ fontSize: 11, color: c.mutedFg }}>{s.artist}</div>
                </div>
                {s.bpm ? <div style={{ fontFamily: fonts.mono, fontSize: 11, color: c.primary }}>{s.bpm} BPM</div> : null}
              </>
            ) : null}
          </div>
        );
      })}
      <div style={{ marginTop: 18 }}>
        <SectionHead label={t.lastRehearsal} />
        <div style={{ display: "flex", gap: 12, alignItems: "center", opacity: interpolate(frame, [70, 85], [0, 1], clamp) }}>
          <div style={{ textAlign: "center", width: 50 }}>
            <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 26, lineHeight: 1 }}>5</div>
            <Label style={{ fontSize: 10 }}>{t.months[3]}</Label>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{b.rehearsal.title}</div>
            <div style={{ fontSize: 11.5, color: c.mutedFg }}>
              {b.rehearsal.location} · {b.rehearsal.minutes} {t.min} · {b.rehearsal.songs} {t.songsCount}
            </div>
          </div>
          <div style={{ display: "flex" }}>
            <Avatar src={data.me.avatar} size={26} />
            <div style={{ marginLeft: -8 }}>
              <Avatar src={data.friend.avatar} size={26} />
            </div>
          </div>
        </div>
      </div>
    </AppScreen>
  );
};
