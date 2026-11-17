import React from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { c, fonts } from "../theme";

/** Valeur 0 → 1 en ressort, a partir de `delay` images. */
export const useSpring = (delay = 0, config: { damping?: number; mass?: number; stiffness?: number } = {}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping: 18, mass: 0.8, ...config } });
};

/** Interpolation bornee, avec un easing doux. */
export const useRamp = (from: number, to: number, outFrom = 0, outTo = 1) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [from, to], [outFrom, outTo], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.33, 1, 0.68, 1),
  });
};

/** Entree : glisse de bas en haut et apparait. */
export const Rise: React.FC<{ delay?: number; distance?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({
  delay = 0,
  distance = 40,
  style,
  children,
}) => {
  const p = useSpring(delay);
  return (
    <div style={{ opacity: Math.min(1, p * 1.4), transform: `translateY(${(1 - p) * distance}px)`, ...style }}>{children}</div>
  );
};

export const Cover: React.FC<{ src: string | null; size: number; radius?: number; style?: React.CSSProperties }> = ({
  src,
  size,
  radius = 4,
  style,
}) =>
  src ? (
    <Img src={staticFile(src)} style={{ width: size, height: size, borderRadius: radius, objectFit: "cover", display: "block", ...style }} />
  ) : (
    <div style={{ width: size, height: size, borderRadius: radius, background: c.muted, ...style }} />
  );

export const Avatar: React.FC<{ src: string | null; size: number }> = ({ src, size }) => (
  <Cover src={src} size={size} radius={size / 2} />
);

/** Petit libelle en capitales, police mono (comme les en-tetes de section de l'app). */
export const Label: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      fontFamily: fonts.mono,
      fontSize: 11,
      letterSpacing: 1.2,
      textTransform: "uppercase",
      color: c.mutedFg,
      ...style,
    }}
  >
    {children}
  </div>
);

/** Titre d'ecran en capitales condensees. */
export const ScreenTitle: React.FC<{ children: React.ReactNode; size?: number; style?: React.CSSProperties }> = ({
  children,
  size = 40,
  style,
}) => (
  <div
    style={{
      fontFamily: fonts.display,
      fontWeight: 800,
      fontSize: size,
      lineHeight: 0.95,
      textTransform: "uppercase",
      color: c.foreground,
      ...style,
    }}
  >
    {children}
  </div>
);

/** Section avec filet, comme « TA SEMAINE ———— Carnet > ». */
export const SectionHead: React.FC<{ label: string; link?: string }> = ({ label, link }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottom: `1px solid ${c.border}`,
      paddingBottom: 8,
      marginBottom: 12,
    }}
  >
    <Label>{label}</Label>
    {link ? (
      <div style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: 12, color: c.foreground }}>{link} ›</div>
    ) : null}
  </div>
);

/** Barre de progression fine, en pointilles comme dans l'app. */
export const Ticks: React.FC<{ value: number; total?: number; width?: number }> = ({ value, total = 14, width = 80 }) => {
  const on = Math.round(value * total);
  return (
    <div style={{ display: "flex", gap: 2, width }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ flex: 1, height: 6, borderRadius: 1, background: i < on ? c.primary : c.muted }} />
      ))}
    </div>
  );
};

/** Disque qui marque un toucher. */
export const Tap: React.FC<{ x: number; y: number; at: number; color?: string }> = ({ x, y, at, color = "rgba(28,26,23,0.35)" }) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < -12 || t > 22) return null;
  const approach = interpolate(t, [-12, 0], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const press = interpolate(t, [0, 6, 22], [1, 0.8, 1.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fade = interpolate(t, [-12, -6, 10, 22], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: x - 28,
        top: y - 28,
        width: 56,
        height: 56,
        borderRadius: 28,
        background: color,
        border: "3px solid rgba(255,255,255,0.9)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
        transform: `scale(${press * (0.6 + 0.4 * approach)})`,
        opacity: fade,
        zIndex: 50,
      }}
    />
  );
};

/** Icone simple en SVG (trait), pour ne pas dependre d'une police d'icones. */
export const Icon: React.FC<{ name: string; size?: number; color?: string; stroke?: number }> = ({
  name,
  size = 22,
  color = c.foreground,
  stroke = 1.8,
}) => {
  const p = { fill: "none", stroke: color, strokeWidth: stroke, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, React.ReactNode> = {
    home: <path {...p} d="M4 11 12 4l8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />,
    play: (
      <>
        <path {...p} d="M5 20 9 6h6l4 14z" />
        <path {...p} d="M12 17 17 8" />
      </>
    ),
    library: (
      <>
        <path {...p} d="M5 5v14M9 5v14M13 5v14" />
        <path {...p} d="m16 5 4 14" />
      </>
    ),
    commu: <path {...p} d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12z" />,
    profile: (
      <>
        <circle {...p} cx="12" cy="8" r="4" />
        <path {...p} d="M5 20c1.2-3.5 4-5 7-5s5.8 1.5 7 5" />
      </>
    ),
    search: (
      <>
        <circle {...p} cx="11" cy="11" r="6" />
        <path {...p} d="m20 20-4.5-4.5" />
      </>
    ),
    triangle: <path d="M8 5v14l11-7z" fill={color} />,
    plus: <path {...p} d="M12 5v14M5 12h14" />,
    minus: <path {...p} d="M5 12h14" />,
    bell: (
      <>
        <path {...p} d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z" />
        <path {...p} d="M10 20a2 2 0 0 0 4 0" />
      </>
    ),
    check: <path {...p} d="m5 12 5 5 9-10" />,
    chat: <path {...p} d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12z" />,
    note: (
      <>
        <path {...p} d="M9 18V6l10-2v12" />
        <circle {...p} cx="6.5" cy="18" r="2.5" />
        <circle {...p} cx="16.5" cy="16" r="2.5" />
      </>
    ),
    calendar: (
      <>
        <rect {...p} x="4" y="5" width="16" height="15" rx="2" />
        <path {...p} d="M4 10h16M9 3v4M15 3v4" />
      </>
    ),
    pin: (
      <>
        <path {...p} d="M12 21s-6-5.5-6-11a6 6 0 1 1 12 0c0 5.5-6 11-6 11z" />
        <circle {...p} cx="12" cy="10" r="2" />
      </>
    ),
    gauge: (
      <>
        <path {...p} d="M4 16a8 8 0 1 1 16 0" />
        <path {...p} d="m12 16 4-5" />
      </>
    ),
    smile: (
      <>
        <circle {...p} cx="12" cy="12" r="8" />
        <path {...p} d="M9 14c.8 1 1.8 1.5 3 1.5s2.2-.5 3-1.5M9.5 10h.01M14.5 10h.01" />
      </>
    ),
    // iOS
    share: (
      <>
        <path {...p} d="M12 3v12M8 7l4-4 4 4" />
        <path {...p} d="M7 10H5v11h14V10h-2" />
      </>
    ),
    dots: (
      <>
        <circle cx="6" cy="12" r="1.6" fill={color} />
        <circle cx="12" cy="12" r="1.6" fill={color} />
        <circle cx="18" cy="12" r="1.6" fill={color} />
      </>
    ),
    back: <path {...p} d="m15 5-7 7 7 7" />,
    addSquare: (
      <>
        <rect {...p} x="4" y="4" width="16" height="16" rx="4" />
        <path {...p} d="M12 8v8M8 12h8" />
      </>
    ),
    copy: (
      <>
        <rect {...p} x="8" y="8" width="12" height="12" rx="2" />
        <path {...p} d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
      </>
    ),
    book: <path {...p} d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11" />,
    star: <path {...p} d="m12 4 2.4 5 5.6.6-4.2 3.8 1.2 5.6L12 16.2 7 19l1.2-5.6L4 9.6 9.6 9z" />,
    glasses: (
      <>
        <circle {...p} cx="7" cy="14" r="3" />
        <circle {...p} cx="17" cy="14" r="3" />
        <path {...p} d="M10 14h4" />
      </>
    ),
    reload: <path {...p} d="M19 12a7 7 0 1 1-2-4.9M19 4v4h-4" />,
    tabs: (
      <>
        <rect {...p} x="4" y="7" width="12" height="12" rx="2" />
        <path {...p} d="M8 7V5h12v12h-4" />
      </>
    ),
    lock: (
      <>
        <rect {...p} x="6" y="11" width="12" height="9" rx="2" />
        <path {...p} d="M9 11V8a3 3 0 0 1 6 0v3" />
      </>
    ),
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", flexShrink: 0 }}>
      {paths[name]}
    </svg>
  );
};
