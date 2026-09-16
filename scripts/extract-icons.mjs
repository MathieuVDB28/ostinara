#!/usr/bin/env node
/**
 * Extrait les noms d'icones Material Symbols reellement utilises dans src/
 * et regenere src/lib/material-symbols.ts.
 *
 * Pourquoi : l'URL Google Fonts sans sous-ensemble sert la police variable
 * complete — 3,9 Mo. Limitee aux icones utilisees, elle tombe a ~6 Ko.
 *
 * A relancer apres avoir ajoute une icone :  npm run icons
 * Le script verifie aupres de Google que chaque nom existe avant d'ecrire.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const SRC = "src";
const OUT = "src/lib/material-symbols.ts";

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if ([".tsx", ".ts"].includes(extname(full))) acc.push(full);
  }
  return acc;
}

const files = walk(SRC);
const names = new Set();

for (const file of files) {
  const src = readFileSync(file, "utf8");

  // 1. <span className="material-symbols-outlined ...">play_arrow</span>
  for (const m of src.matchAll(
    /material-symbols-outlined[^>]*>\s*([a-z0-9_]+)\s*</g
  )) {
    names.add(m[1]);
  }

  // 1 bis. Le nom calcule dans une expression :
  //   <span className="material-symbols-outlined">{query ? "search_off" : "filter_list"}</span>
  // La regle 1 ne voit rien ici, et les deux branches sont necessaires :
  // celle qui manque s'affichait en texte brut ("search_off") dans la vue
  // Albums.
  for (const m of src.matchAll(
    /material-symbols-outlined[^>]*>\s*\{([^}]*)\}\s*</g
  )) {
    for (const lit of m[1].matchAll(/"([a-z][a-z0-9_]*)"/g)) {
      names.add(lit[1]);
    }
  }

  // 2. Les icones passees en prop ou via une table de correspondance.
  //    On ne scanne que les fichiers qui manipulent des Material Symbols,
  //    pour ne pas ramasser les noms d'icones SVG maison (NavIcon).
  if (src.includes("material-symbols-outlined") || /\bicon:\s*"/.test(src)) {
    for (const m of src.matchAll(/\bicon[:=]\s*"([a-z0-9_]+)"/g)) {
      names.add(m[1]);
    }
    for (const m of src.matchAll(/\bicon=\{"([a-z0-9_]+)"\}/g)) {
      names.add(m[1]);
    }
  }
}

const candidates = [...names].sort();
console.log(`${candidates.length} noms candidats extraits de ${files.length} fichiers.`);

// Validation aupres de Google : un nom inconnu ferait echouer la requete
// et la page perdrait toutes ses icones. On verifie avant d'ecrire.
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36";

async function cssFor(list) {
  const url =
    "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" +
    `&icon_names=${list.join(",")}&display=block`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  return res.ok ? await res.text() : null;
}

let valid = candidates;
if (!(await cssFor(candidates))) {
  console.log("Au moins un nom est inconnu de Google — tri un par un...");
  valid = [];
  for (const name of candidates) {
    if (await cssFor([name])) valid.push(name);
    else console.log(`  ignore (inconnu) : ${name}`);
  }
}

const header = `// GENERE PAR scripts/extract-icons.mjs — ne pas editer a la main.
// Relancer avec : npm run icons
//
// La police est sous-ensemblee aux icones ci-dessous. Une icone ajoutee dans
// le code mais absente de cette liste s'affichera sous forme de texte brut :
// relancer le script apres tout ajout.
`;

const body = `${header}
export const MATERIAL_SYMBOLS = ${JSON.stringify(valid, null, 2)} as const;

export const MATERIAL_SYMBOLS_HREF =
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" +
  "&icon_names=" +
  MATERIAL_SYMBOLS.join(",") +
  "&display=block";
`;

writeFileSync(OUT, body);
console.log(`${valid.length} icones validees → ${OUT}`);
