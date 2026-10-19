/**
 * Les traductions : index et coherence.
 *
 * 1. Regenere messages/<langue>/index.ts d'apres les fichiers JSON presents
 *    (un fichier = un namespace).
 * 2. Verifie que l'anglais a exactement les cles du francais, avec les
 *    memes variables ICU ({count}, {name}…) — une variable oubliee
 *    s'afficherait telle quelle, entre accolades.
 *
 * node scripts/check-i18n.mjs        (exit 1 au premier ecart)
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "@formatjs/icu-messageformat-parser";

const ROOT = new URL("../messages/", import.meta.url).pathname;
const SOURCE = "fr";
const LOCALES = ["fr", "en"];

function namespaces(locale) {
  return readdirSync(join(ROOT, locale))
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.slice(0, -5))
    .sort();
}

function writeIndex(locale) {
  const names = namespaces(locale);
  const ident = (n) => n.replace(/-(\w)/g, (_, c) => c.toUpperCase());
  const body = [
    "// Genere par scripts/check-i18n.mjs : ne pas modifier a la main.",
    ...names.map((n) => `import ${ident(n)} from "./${n}.json";`),
    "",
    "const messages = {",
    ...names.map((n) => `  ${JSON.stringify(n)}: ${ident(n)},`),
    "};",
    "",
    "export default messages;",
    "",
  ].join("\n");
  writeFileSync(join(ROOT, locale, "index.ts"), body);
}

function flatten(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") flatten(v, key, out);
    else out[key] = String(v);
  }
  return out;
}

/** Les variables d'un message ICU (y compris dans les branches plural/select). */
function variables(message) {
  const vars = new Set();
  const walk = (nodes) => {
    for (const node of nodes) {
      // 0 = litteral, 7 = # ; tout le reste porte un nom de variable
      if (node.value !== undefined && node.type !== 0 && node.type !== 7) vars.add(node.value);
      if (node.options) for (const opt of Object.values(node.options)) walk(opt.value);
      if (node.children) walk(node.children);
    }
  };
  try {
    walk(parse(message));
  } catch (e) {
    return `!syntaxe: ${e.message}`;
  }
  return [...vars].sort().join(",");
}

function load(locale) {
  const all = {};
  for (const n of namespaces(locale)) {
    const json = JSON.parse(readFileSync(join(ROOT, locale, `${n}.json`), "utf8"));
    Object.assign(all, flatten(json, n));
  }
  return all;
}

for (const locale of LOCALES) writeIndex(locale);

const source = load(SOURCE);
let errors = 0;
for (const [key, message] of Object.entries(source)) {
  if (variables(message).startsWith("!")) {
    console.error(`[${SOURCE}] ICU invalide : ${key}`);
    errors++;
  }
}
for (const locale of LOCALES.filter((l) => l !== SOURCE)) {
  const target = load(locale);
  for (const key of Object.keys(source)) {
    if (!(key in target)) {
      console.error(`[${locale}] cle manquante : ${key}`);
      errors++;
    } else if (variables(source[key]) !== variables(target[key])) {
      console.error(`[${locale}] variables differentes : ${key} (${variables(source[key])} / ${variables(target[key])})`);
      errors++;
    }
  }
  for (const key of Object.keys(target)) {
    if (!(key in source)) {
      console.error(`[${locale}] cle en trop : ${key}`);
      errors++;
    }
  }
}

if (errors) {
  console.error(`${errors} ecart(s).`);
  process.exit(1);
}
console.log(`Traductions OK : ${Object.keys(source).length} cles.`);
