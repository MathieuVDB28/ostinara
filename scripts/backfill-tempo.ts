/**
 * Rattrapage du tempo cible pour les morceaux deja en biblio.
 *
 * Depuis octobre 2026, `createSong` cherche le tempo d'un nouveau morceau
 * (Songsterr, puis Deezer). Ce script fait la meme recherche — la meme
 * fonction, `findSongTempo` — pour tous les morceaux sans `target_bpm`.
 *
 * A blanc par defaut : le script dit ce qu'il ferait. `--apply` ecrit.
 *
 *   npx tsx scripts/backfill-tempo.ts          # a blanc
 *   npx tsx scripts/backfill-tempo.ts --apply  # ecrit en base
 *
 * Lit NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env et
 * .env.local. N'ecrit que sur un `target_bpm` encore vide.
 */

import { readFileSync, existsSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { findSongTempo } from "../src/lib/services/tempo";

const APPLY = process.argv.includes("--apply");

const env: Record<string, string | undefined> = { ...process.env };
for (const file of [".env", ".env.local"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) env[match[1]] = match[2].replace(/^"|"$/g, "");
  }
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log(APPLY ? "Mode ecriture (--apply)\n" : "Mode a blanc : rien n'est ecrit. Relancer avec --apply.\n");

  const { data: rows, error } = await supabase
    .from("songs")
    .select("id, title, artist, deezer_id, tabs_url")
    .is("target_bpm", null);
  if (error) throw error;

  let found = 0;
  const missed: string[] = [];
  for (const row of rows ?? []) {
    // Songsterr et Deezer n'aiment pas les rafales.
    await sleep(300);
    const bpm = await findSongTempo(row);
    if (!bpm) {
      missed.push(`${row.artist} — ${row.title}`);
      continue;
    }
    console.log(`  ${bpm} BPM  ${row.artist} — ${row.title}`);
    if (APPLY) {
      const { error: updateError } = await supabase
        .from("songs")
        .update({ target_bpm: bpm })
        .eq("id", row.id)
        .is("target_bpm", null);
      if (updateError) {
        console.error(`  ! ${row.id}: ${updateError.message}`);
        continue;
      }
    }
    found++;
  }

  console.log(`\n${found}/${rows?.length ?? 0} tempos trouves`);
  for (const line of missed) console.log(`  - introuvable : ${line}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
