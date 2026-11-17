import { loadFont as loadBarlow } from "@remotion/google-fonts/BarlowCondensed";
import { loadFont as loadJakarta } from "@remotion/google-fonts/PlusJakartaSans";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadBitter } from "@remotion/google-fonts/Bitter";

// Memes polices que l'app (src/app/layout.tsx).
export const fonts = {
  display: loadBarlow("normal", { weights: ["600", "700", "800"], subsets: ["latin"] }).fontFamily,
  sans: loadJakarta("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] }).fontFamily,
  mono: loadMono("normal", { weights: ["400", "500"], subsets: ["latin"] }).fontFamily,
  serif: loadBitter("italic", { weights: ["400"], subsets: ["latin"] }).fontFamily,
  ios: "-apple-system, 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif",
};

// Palette claire de l'app (src/app/globals.css), sans y toucher.
export const c = {
  background: "#f6f4f1",
  foreground: "#1c1a17",
  muted: "#e9e5df",
  mutedFg: "#5e5850",
  card: "#ffffff",
  border: "#e4dfd6",
  primary: "#8a5214",
  primaryFg: "#ffffff",
  secondary: "#efebe4",
  success: "#2f6b3c",
  // Variante claire du primaire (theme sombre de l'app), pour les fonds sombres.
  primaryLight: "#e0a34a",
  dark: "#141210",
  darkCard: "#1e1b17",
  darkFg: "#f2efea",
};

export const FPS = 30;
