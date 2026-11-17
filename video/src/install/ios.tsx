import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { c, fonts } from "../theme";
import type { T } from "../i18n";
import { Cover, Icon, useSpring } from "../components/ui";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ios = { blue: "#0a84ff", sep: "rgba(60,60,67,0.18)", group: "#f2f2f7", label: "#000", secondary: "rgba(60,60,67,0.6)" };

/** La landing d'Ostinara telle qu'elle apparait dans Safari. */
export const LandingPage: React.FC<{ t: T; loaded?: number }> = ({ t, loaded = 1 }) => (
  <div style={{ flex: 1, background: c.background, padding: "30px 24px", opacity: loaded, fontFamily: fonts.sans }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 60 }}>
      <Cover src="icon.png" size={34} radius={8} />
      <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 24, textTransform: "uppercase" }}>Ostinara</div>
    </div>
    <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 58, lineHeight: 0.92, textTransform: "uppercase", color: c.foreground }}>
      {t.landingTitle}
    </div>
    <div style={{ fontSize: 16, lineHeight: 1.45, color: c.mutedFg, marginTop: 18 }}>{t.tagline}.</div>
    <div style={{ marginTop: 30, background: c.primary, color: "#fff", borderRadius: 10, padding: "14px 0", textAlign: "center", fontWeight: 700, fontSize: 15 }}>
      {t.landingCta}
    </div>
  </div>
);

/** Barre de Safari (iOS 26, disposition compacte) : precedent, adresse, trois points. */
export const SafariBar: React.FC<{ url: string; cursor?: boolean; focus?: boolean }> = ({ url, cursor, focus }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 104, padding: "10px 14px 0", display: "flex", gap: 10, alignItems: "flex-start", zIndex: 30 }}>
      <div style={{ width: 48, height: 48, borderRadius: 24, background: "rgba(255,255,255,0.9)", boxShadow: "0 2px 12px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name="back" size={20} color="#222" />
      </div>
      <div
        style={{
          flex: 1,
          height: 48,
          borderRadius: 24,
          background: "rgba(255,255,255,0.92)",
          boxShadow: focus ? `0 0 0 2px ${ios.blue}, 0 2px 12px rgba(0,0,0,0.12)` : "0 2px 12px rgba(0,0,0,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          fontFamily: fonts.ios,
          fontSize: 16,
          color: "#111",
        }}
      >
        {url ? <Icon name="lock" size={13} color="#666" /> : null}
        <span>{url}</span>
        {cursor && Math.floor(frame / 12) % 2 === 0 ? <span style={{ width: 2, height: 20, background: ios.blue }} /> : null}
      </div>
      <div style={{ width: 48, height: 48, borderRadius: 24, background: "rgba(255,255,255,0.9)", boxShadow: "0 2px 12px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name="dots" size={22} color="#222" />
      </div>
    </div>
  );
};

/** Menu des trois points. */
export const PageMenu: React.FC<{ t: T; at: number; highlight?: boolean }> = ({ t, at, highlight }) => {
  const p = useSpring(at, { damping: 16 });
  const rows: [string, string][] = [
    ["share", t.iosShare],
    ["book", t.iosAddBookmark],
    ["star", t.iosAddFav],
    ["glasses", t.iosReadingList],
    ["reload", t.iosReload],
    ["tabs", t.iosNewTab],
  ];
  return (
    <div
      style={{
        position: "absolute",
        right: 14,
        bottom: 116,
        width: 250,
        borderRadius: 22,
        background: "rgba(250,250,250,0.97)",
        boxShadow: "0 16px 50px rgba(0,0,0,0.25)",
        overflow: "hidden",
        transform: `scale(${0.3 + 0.7 * p})`,
        transformOrigin: "bottom right",
        opacity: Math.min(1, p * 1.5),
        zIndex: 40,
        fontFamily: fonts.ios,
      }}
    >
      {rows.map(([ic, l], i) => (
        <div
          key={l}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "13px 18px",
            fontSize: 16,
            borderBottom: i < rows.length - 1 ? `1px solid ${ios.sep}` : "none",
            background: highlight && i === 0 ? "rgba(0,0,0,0.08)" : "transparent",
          }}
        >
          <span>{l}</span>
          <Icon name={ic} size={19} color="#222" />
        </div>
      ))}
    </div>
  );
};

/** Feuille de partage, avec defilement de la liste d'actions. */
export const ShareSheet: React.FC<{ t: T; at: number; scroll?: number; highlight?: boolean }> = ({ t, at, scroll = 0, highlight }) => {
  const p = useSpring(at, { damping: 20 });
  const actions: [string, string][] = [
    ["copy", t.iosCopy],
    ["glasses", t.iosReadingList],
    ["book", t.iosAddBookmark],
    ["star", t.iosAddFav],
    ["search", t.iosFind],
    ["addSquare", t.iosHome],
  ];
  return (
    <>
      <div style={{ position: "absolute", inset: -60, background: "rgba(0,0,0,0.25)", opacity: p, zIndex: 41 }} />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: -10,
          height: 610,
          borderRadius: "34px 34px 0 0",
          background: ios.group,
          transform: `translateY(${(1 - p) * 640}px)`,
          zIndex: 42,
          fontFamily: fonts.ios,
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "22px 20px 16px" }}>
          <Cover src="icon.png" size={48} radius={11} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>Ostinara</div>
            <div style={{ fontSize: 13, color: ios.secondary }}>ostinara.vercel.app</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, padding: "6px 20px 18px" }}>
          {["#34c759", "#0a84ff", "#ffcc00", "#5856d6"].map((col) => (
            <div key={col} style={{ width: 60, height: 60, borderRadius: 15, background: col, opacity: 0.85 }} />
          ))}
        </div>
        <div style={{ transform: `translateY(${-scroll}px)` }}>
          <div style={{ margin: "0 16px", borderRadius: 14, background: "#fff", overflow: "hidden" }}>
            {actions.map(([ic, l], i) => {
              const hl = highlight && i === actions.length - 1;
              return (
                <div
                  key={l}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "15px 18px",
                    fontSize: 16.5,
                    borderBottom: i < actions.length - 1 ? `1px solid ${ios.sep}` : "none",
                    background: hl ? "#e5e5ea" : "#fff",
                    fontWeight: i === actions.length - 1 ? 600 : 400,
                  }}
                >
                  <span>{l}</span>
                  <Icon name={ic} size={21} color="#222" />
                </div>
              );
            })}
          </div>
          <div style={{ height: 300 }} />
        </div>
      </div>
    </>
  );
};

const Switch: React.FC<{ on: boolean }> = ({ on }) => (
  <div style={{ width: 51, height: 31, borderRadius: 16, background: on ? "#34c759" : "#e9e9ea", position: "relative" }}>
    <div style={{ position: "absolute", top: 2, left: on ? 22 : 2, width: 27, height: 27, borderRadius: 14, background: "#fff", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }} />
  </div>
);

/** Feuille « Ajouter a l'ecran d'accueil ». */
export const AddToHome: React.FC<{ t: T; at: number; pressAdd?: boolean; glowToggle?: number }> = ({ t, at, pressAdd, glowToggle = 0 }) => {
  const p = useSpring(at, { damping: 20 });
  return (
    <div
      style={{
        position: "absolute",
        inset: "-60px 0 -40px 0",
        background: ios.group,
        transform: `translateY(${(1 - p) * 900}px)`,
        zIndex: 45,
        fontFamily: fonts.ios,
        paddingTop: 70,
        borderRadius: "34px 34px 0 0",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 18px 22px" }}>
        <span style={{ color: ios.blue, fontSize: 17 }}>{t.iosCancel}</span>
        <span style={{ fontWeight: 600, fontSize: 16 }}>{t.iosAddToHomeTitle}</span>
        <span style={{ color: ios.blue, fontSize: 17, fontWeight: 600, background: pressAdd ? "rgba(10,132,255,0.15)" : "transparent", borderRadius: 8, padding: "2px 6px" }}>{t.iosAdd}</span>
      </div>
      <div style={{ margin: "0 16px", borderRadius: 14, background: "#fff", padding: 16, display: "flex", gap: 14, alignItems: "center" }}>
        <Cover src="icon.png" size={62} radius={14} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, paddingBottom: 8, borderBottom: `1px solid ${ios.sep}` }}>Ostinara</div>
          <div style={{ fontSize: 14, color: ios.secondary, paddingTop: 8 }}>https://ostinara.vercel.app/</div>
        </div>
      </div>
      <div
        style={{
          margin: "22px 16px 0",
          borderRadius: 14,
          background: "#fff",
          padding: "12px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: glowToggle ? `0 0 0 ${3 * glowToggle}px rgba(52,199,89,0.5)` : "none",
        }}
      >
        <span style={{ fontSize: 17 }}>{t.iosWebApp}</span>
        <Switch on />
      </div>
    </div>
  );
};

/** Ecran d'accueil de l'iPhone, avec l'icone d'Ostinara qui arrive. */
export const HomeScreen: React.FC<{ iconAt: number; pressAt?: number }> = ({ iconAt, pressAt = 9999 }) => {
  const frame = useCurrentFrame();
  const pop = useSpring(iconAt, { damping: 9, stiffness: 140 });
  const press = interpolate(frame, [pressAt, pressAt + 5, pressAt + 10], [1, 0.86, 1], clamp);
  const zoom = interpolate(frame, [pressAt + 10, pressAt + 28], [0, 1], clamp);
  const colors = ["#ff9500", "#34c759", "#0a84ff", "#ff2d55", "#5ac8fa", "#af52de", "#ffcc00", "#8e8e93", "#30b0c7", "#ff3b30", "#64d2ff", "#a2845e", "#32d74b", "#5e5ce6", "#ff9f0a"];
  return (
    <div style={{ position: "absolute", inset: "-54px 0 0 0", background: "linear-gradient(160deg, #c79a63 0%, #8a5214 45%, #3b2410 100%)", fontFamily: fonts.ios }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 64px)", columnGap: 26, rowGap: 30, padding: "90px 0 0", justifyContent: "center" }}>
        {colors.map((col, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ width: 64, height: 64, borderRadius: 15, background: col, opacity: 0.9 }} />
            <div style={{ width: 40, height: 7, borderRadius: 4, background: "rgba(255,255,255,0.55)" }} />
          </div>
        ))}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, transform: `scale(${pop * press})` }}>
          <Cover src="icon.png" size={64} radius={15} style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.3)" }} />
          <div style={{ fontSize: 12, color: "#fff", fontWeight: 500 }}>Ostinara</div>
        </div>
      </div>
      {/* Dock */}
      <div style={{ position: "absolute", left: 14, right: 14, bottom: 26, height: 92, borderRadius: 34, background: "rgba(255,255,255,0.25)", display: "flex", justifyContent: "space-around", alignItems: "center", padding: "0 14px" }}>
        {["#34c759", "#0a84ff", "#ffffff", "#ff9500"].map((col) => (
          <div key={col} style={{ width: 64, height: 64, borderRadius: 15, background: col, opacity: 0.9 }} />
        ))}
      </div>
      {/* Ouverture de l'app */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: c.background,
          opacity: zoom,
          transform: `scale(${0.2 + 0.8 * zoom})`,
          transformOrigin: "85% 49%",
          borderRadius: 40 * (1 - zoom),
        }}
      />
    </div>
  );
};

/** Alerte systeme de demande d'autorisation des notifications. */
export const NotifAlert: React.FC<{ t: T; at: number; pressAllow?: boolean }> = ({ t, at, pressAllow }) => {
  const p = useSpring(at, { damping: 16 });
  return (
    <>
      <div style={{ position: "absolute", inset: -60, background: "rgba(0,0,0,0.3)", opacity: p, zIndex: 60 }} />
      <div
        style={{
          position: "absolute",
          left: 45,
          right: 45,
          top: 270,
          borderRadius: 24,
          background: "rgba(245,245,245,0.97)",
          transform: `scale(${1.15 - 0.15 * p})`,
          opacity: p,
          zIndex: 61,
          fontFamily: fonts.ios,
          textAlign: "center",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "20px 18px 16px" }}>
          <div style={{ fontWeight: 600, fontSize: 16.5, lineHeight: 1.3 }}>{t.iosNotifAsk}</div>
          <div style={{ fontSize: 13, lineHeight: 1.35, marginTop: 6, color: "#333" }}>{t.iosNotifBody}</div>
        </div>
        <div style={{ display: "flex", borderTop: `1px solid ${ios.sep}` }}>
          <div style={{ flex: 1, padding: "13px 0", color: ios.blue, fontSize: 16.5, borderRight: `1px solid ${ios.sep}` }}>{t.iosDeny}</div>
          <div style={{ flex: 1, padding: "13px 0", color: ios.blue, fontSize: 16.5, fontWeight: 600, background: pressAllow ? "rgba(0,0,0,0.08)" : "transparent" }}>{t.iosAllow}</div>
        </div>
      </div>
    </>
  );
};
