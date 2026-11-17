import React from "react";
import { c, fonts } from "../theme";
import { Icon } from "./ui";

export const SCREEN_W = 390;
export const SCREEN_H = 844;

/** Barre d'etat iOS. */
export const StatusBar: React.FC<{ color?: string }> = ({ color = c.foreground }) => (
  <div
    style={{
      height: 54,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "6px 34px 0 44px",
      fontFamily: fonts.ios,
      fontWeight: 600,
      fontSize: 16,
      color,
      flexShrink: 0,
    }}
  >
    <span>9:41</span>
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <svg width="18" height="12" viewBox="0 0 18 12">
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={i * 4.6} y={9 - i * 3} width="3.2" height={3 + i * 3} rx="0.8" fill={color} />
        ))}
      </svg>
      <svg width="26" height="13" viewBox="0 0 26 13">
        <rect x="0.5" y="0.5" width="22" height="12" rx="3.5" fill="none" stroke={color} opacity="0.4" />
        <rect x="2" y="2" width="17" height="9" rx="2" fill={color} />
        <rect x="23.5" y="4.5" width="1.6" height="4" rx="0.8" fill={color} opacity="0.4" />
      </svg>
    </div>
  </div>
);

/** Un iPhone : cadre, ilot, barre d'etat et indicateur d'accueil. */
export const Phone: React.FC<{
  children: React.ReactNode;
  scale?: number;
  background?: string;
  statusColor?: string;
  hideStatus?: boolean;
  style?: React.CSSProperties;
}> = ({ children, scale = 1, background = c.background, statusColor, hideStatus, style }) => (
  <div
    style={{
      width: SCREEN_W + 28,
      height: SCREEN_H + 28,
      borderRadius: 68,
      background: "#1a1816",
      padding: 14,
      boxShadow: "0 40px 90px rgba(60,40,20,0.28), 0 10px 30px rgba(60,40,20,0.18), inset 0 0 0 2px #3a3530",
      transform: `scale(${scale})`,
      transformOrigin: "center center",
      flexShrink: 0,
      ...style,
    }}
  >
    <div
      style={{
        width: SCREEN_W,
        height: SCREEN_H,
        borderRadius: 54,
        overflow: "hidden",
        position: "relative",
        background,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {hideStatus ? null : <StatusBar color={statusColor} />}
      <div style={{ flex: 1, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>{children}</div>
      {/* Ilot */}
      <div
        style={{
          position: "absolute",
          top: 11,
          left: "50%",
          marginLeft: -62,
          width: 124,
          height: 36,
          borderRadius: 18,
          background: "#000",
          zIndex: 100,
        }}
      />
      {/* Indicateur d'accueil */}
      <div
        style={{
          position: "absolute",
          bottom: 8,
          left: "50%",
          marginLeft: -70,
          width: 140,
          height: 5,
          borderRadius: 3,
          background: statusColor ?? c.foreground,
          opacity: 0.85,
          zIndex: 100,
        }}
      />
    </div>
  </div>
);

const TABS = ["home", "play", "library", "commu", "profile"] as const;
export type Tab = (typeof TABS)[number];

/** Barre d'onglets flottante de l'app (bottom-tab-bar.tsx). */
export const TabBar: React.FC<{ active: Tab }> = ({ active }) => (
  <div
    style={{
      position: "absolute",
      bottom: 26,
      left: "50%",
      transform: "translateX(-50%)",
      display: "flex",
      gap: 4,
      padding: 5,
      borderRadius: 30,
      background: "rgba(255,255,255,0.88)",
      border: `1px solid ${c.border}`,
      boxShadow: "0 8px 24px rgba(60,40,20,0.12)",
      zIndex: 40,
    }}
  >
    {TABS.map((tab) => (
      <div
        key={tab}
        style={{
          width: 52,
          height: 40,
          borderRadius: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: tab === active ? c.muted : "transparent",
        }}
      >
        <Icon name={tab} size={20} />
      </div>
    ))}
  </div>
);

/** Contenu d'un ecran de l'app, avec sa marge et la barre d'onglets. */
export const AppScreen: React.FC<{ tab: Tab; children: React.ReactNode; scrollY?: number }> = ({ tab, children, scrollY = 0 }) => (
  <div style={{ flex: 1, position: "relative", overflow: "hidden", fontFamily: fonts.sans, color: c.foreground }}>
    <div style={{ padding: "8px 18px 120px", transform: `translateY(${-scrollY}px)` }}>{children}</div>
    <TabBar active={tab} />
  </div>
);
