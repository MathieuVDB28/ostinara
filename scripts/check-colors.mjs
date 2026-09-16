#!/usr/bin/env node
/**
 * Echoue si une classe de la palette Tailwind par defaut reapparait
 * dans src/.
 *
 * Pourquoi : ces teintes sont calees sur un fond sombre et ne s'adaptent
 * pas. En theme clair, text-green-400 sur une carte blanche donne 1,74:1
 * et text-amber-400 1,67:1, la ou il en faut 4,5:1. Les jetons de
 * globals.css, eux, ont une variante par appearance et leurs ratios sont
 * documentes.
 *
 *   vert / emeraude   -> success        rouge / rose  -> destructive
 *   ambre / jaune     -> primary        bleu / cyan   -> chart-2
 *   violet / rose     -> primary        gris          -> muted-foreground
 *   series de donnees -> chart-1..5
 *
 * Lancer :  npm run check:colors
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

// Une couleur de marque est la couleur de la marque, pas un etat de
// l'app : le vert de Spotify reste le vert de Spotify.
const ALLOWED = new Set([
  "src/components/library/spotify-suggestions.tsx",
  "src/components/profile/spotify-connect-section.tsx",
]);

const FAMILIES = [
  "red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal",
  "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink",
  "rose", "slate", "gray", "zinc", "neutral", "stone",
].join("|");

const PROPS = [
  "text", "bg", "border", "from", "to", "via", "ring", "shadow", "fill",
  "stroke", "divide", "outline", "decoration", "accent", "caret",
].join("|");

const PATTERN = new RegExp(
  `(?<![\\w-])(?:[a-z-]+:)*(?:${PROPS})-(?:${FAMILIES})-[0-9]{2,3}(?:/[0-9]{1,3})?(?![\\w-])`,
  "g"
);

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if ([".tsx", ".ts"].includes(extname(full))) acc.push(full);
  }
  return acc;
}

const offenses = [];

for (const file of walk("src")) {
  if (ALLOWED.has(file)) continue;
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, index) => {
    for (const match of line.matchAll(PATTERN)) {
      offenses.push(`${file}:${index + 1}  ${match[0]}`);
    }
  });
}

if (offenses.length === 0) {
  console.log("✓ Aucune classe de la palette Tailwind par defaut dans src/.");
  process.exit(0);
}

console.error(
  `✗ ${offenses.length} classe(s) de la palette Tailwind par defaut — utiliser les jetons de globals.css :\n`
);
for (const offense of offenses) console.error(`  ${offense}`);
console.error(
  "\nSi c'est volontaire (couleur de marque), ajouter le fichier a ALLOWED dans scripts/check-colors.mjs."
);
process.exit(1);
