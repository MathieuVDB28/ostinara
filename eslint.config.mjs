import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Choix du projet : <img> plutot que next/image. Les pochettes
      // arrivent deja dimensionnees par leur CDN (Deezer, Supabase), et
      // le matos ou les fiches Wikipedia pointent vers des hotes libres
      // que l'optimiseur refuserait (cf. src/components/ui/cover.tsx).
      "@next/next/no-img-element": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Service worker genere et minifie par next-pwa au build (cf. .gitignore).
    "public/sw.js",
    "public/workbox-*.js",
    "public/fallback-*.js",
  ]),
]);

export default eslintConfig;
