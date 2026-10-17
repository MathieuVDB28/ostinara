import { ImageResponse } from "next/og";

/*
 * L'apercu du lien partage sur Insta, Discord, WhatsApp… La page
 * d'accueil va circuler dans les communautes musicales : sans image, le
 * lien s'afficherait en texte nu. Palette claire de globals.css.
 */

export const alt = "Ostinara — Joue. Mesure. Partage. L'app des guitaristes.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Barlow Condensed 800, limitee aux glyphes de l'image. */
async function loadDisplayFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@800&text=${encodeURIComponent(text)}`
    ).then((response) => response.text());
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    return await fetch(url).then((response) => response.arrayBuffer());
  } catch {
    // Pas de reseau au build : l'image sort avec la police par defaut.
    return null;
  }
}

export default async function OpengraphImage() {
  const glyphs = "OSTINARAJOUE.MESURE.PARTAGE.L'APP DES GUITARISTESACCÈS ANTICIPÉ·92/104BPM";
  const font = await loadDisplayFont(glyphs);
  const display = font ? "Barlow Condensed" : "sans-serif";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "#f6f4f1",
          color: "#1c1a17",
          fontFamily: display,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 34, textTransform: "uppercase" }}>
          <span>Ostinara</span>
          <span style={{ color: "#5e5850" }}>Accès anticipé</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 150, lineHeight: 0.84, textTransform: "uppercase" }}>
            <span>Joue.</span>
            <span>Mesure.</span>
            <span style={{ color: "#8a5214" }}>Partage.</span>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              borderTop: "2px solid #e4dfd6",
              borderBottom: "2px solid #e4dfd6",
              padding: "20px 0",
            }}
          >
            <span style={{ fontSize: 120, lineHeight: 0.9 }}>
              92<span style={{ fontSize: 44, color: "#5e5850" }}>/104</span>
            </span>
            <div style={{ display: "flex", gap: 5, marginTop: 14 }}>
              {Array.from({ length: 12 }, (_, i) => (
                <div
                  key={i}
                  style={{ width: 14, height: 22, borderRadius: 3, background: i < 9 ? "#8a5214" : "#e9e5df" }}
                />
              ))}
            </div>
          </div>
        </div>
        <span style={{ fontSize: 30, color: "#5e5850", textTransform: "uppercase" }}>
          L&apos;app des guitaristes
        </span>
      </div>
    ),
    {
      ...size,
      fonts: font ? [{ name: "Barlow Condensed", data: font, weight: 800, style: "normal" }] : undefined,
    }
  );
}
