#!/usr/bin/env node
/**
 * Rattrapage du passage Spotify -> Deezer.
 *
 * Retrouve sur Deezer l'equivalent de chaque morceau, album note, album
 * « À écouter » et album favori enregistre du temps de Spotify, et remplit
 * `deezer_id` (et `favorite_track_deezer_id` pour les avis). Les pochettes
 * encore hebergees chez Spotify (i.scdn.co) sont remplacees par celles de
 * Deezer.
 *
 * A blanc par defaut : le script dit ce qu'il ferait. `--apply` ecrit.
 *
 *   node scripts/backfill-deezer.mjs          # a blanc
 *   node scripts/backfill-deezer.mjs --apply  # ecrit en base
 *
 * Lit NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env et
 * .env.local. Reste sous le quota Deezer (~50 requetes / 5 s).
 */

import { readFileSync, existsSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");

const env = { ...process.env };
for (const file of [".env", ".env.local"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) env[match[1]] = match[2].replace(/^"|"$/g, "");
  }
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// ---------------------------------------------------------------------------
// Deezer (memes regles de correspondance que src/lib/services/deezer.ts)
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function deezer(path) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await sleep(150);
    const response = await fetch(`https://api.deezer.com${path}`);
    const data = await response.json().catch(() => null);
    if (data?.error?.code === 4) {
      // Quota depasse : on souffle et on reessaie.
      await sleep(5000);
      continue;
    }
    return data && !data.error ? data : null;
  }
  return null;
}

/** Le titre sans « (Remastered) » ni « - Live » : Deezer ne trouve rien avec. */
function clean(value) {
  return String(value ?? "").replace(/\s*[([].*?[)\]]\s*/g, " ").replace(/\s+-\s+.*$/, "").trim();
}

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s*[([].*?[)\]]\s*/g, " ")
    .replace(/\s+-\s+.*$/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Les editions qu'on ne choisit qu'a defaut (coffrets, lives, deluxe).
const SPECIAL_EDITION = /box set|deluxe|live|anniversary|expanded|demo|edition/gi;
const editionPenalty = (name) => String(name).match(SPECIAL_EDITION)?.length ?? 0;

function pick(items, wantedName, wantedArtist, nameOf, artistOf) {
  const artist = normalize(wantedArtist.split(",")[0]);
  const name = normalize(wantedName);
  const sameArtist = items.filter((item) => normalize(artistOf(item)) === artist);
  const simplest = (list) =>
    list.reduce((best, item) => (!best || editionPenalty(nameOf(item)) < editionPenalty(nameOf(best)) ? item : best), null);
  return (
    simplest(sameArtist.filter((item) => normalize(nameOf(item)) === name)) ??
    simplest(
      sameArtist.filter((item) => {
        const candidate = normalize(nameOf(item));
        return candidate.startsWith(name) || name.startsWith(candidate);
      })
    )
  );
}

// Recherche libre d'abord : la stricte (`artist:"…" album:"…"`) remonte
// surtout des reprises d'autres artistes. Puis la stricte, puis la
// discographie de l'artiste (albums eponymes).
async function findAlbum(name, artist) {
  const main = artist.split(",")[0].trim();
  const title = clean(name);
  const byName = (items) => pick(items, name, artist, (album) => album.title, (album) => album.artist?.name);

  // Une edition standard trouvee par la recherche suffit ; sinon on compare
  // avec la discographie, qui a souvent l'edition simple (pas le coffret).
  const loose = byName((await deezer(`/search/album?q=${encodeURIComponent(`${main} ${title}`)}&limit=15`))?.data ?? []);
  if (loose && editionPenalty(loose.title) === 0) return loose;

  let fromDiscography = null;
  const artists = await deezer(`/search/artist?q=${encodeURIComponent(main)}&limit=1`);
  const match = artists?.data?.[0];
  if (match && normalize(match.name) === normalize(main)) {
    const albums = await deezer(`/artist/${match.id}/albums?limit=100`);
    fromDiscography = byName(
      (albums?.data ?? [])
        .filter((album) => album.record_type === "album" || album.record_type === "ep")
        .map((album) => ({ ...album, artist: { name: match.name } }))
    );
  }

  const best = [loose, fromDiscography]
    .filter(Boolean)
    .sort((a, b) => editionPenalty(a.title) - editionPenalty(b.title))[0];
  if (best) return best;

  const strict = await deezer(`/search/album?q=${encodeURIComponent(`artist:"${main}" album:"${title}"`)}&limit=15`);
  return byName(strict?.data ?? []);
}

async function findTrack(title, artist) {
  const main = artist.split(",")[0].trim();
  const byName = (items) => pick(items, title, artist, (track) => track.title, (track) => track.artist?.name);
  const loose = await deezer(`/search/track?q=${encodeURIComponent(`${main} ${clean(title)}`)}&limit=15`);
  const found = byName(loose?.data ?? []);
  if (found) return found;
  const strict = await deezer(`/search/track?q=${encodeURIComponent(`artist:"${main}" track:"${clean(title)}"`)}&limit=15`);
  return byName(strict?.data ?? []);
}

const isSpotifyCover = (url) => typeof url === "string" && url.includes("scdn.co");

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

const report = [];
/** Les correspondances approchees (titre different), a relire. */
const approximate = [];

async function update(table, id, changes) {
  if (!APPLY) return true;
  const { error } = await supabase.from(table).update(changes).eq("id", id);
  if (error) {
    console.error(`  ! ${table} ${id}: ${error.message}`);
    return false;
  }
  return true;
}

async function backfillSongs() {
  const { data: rows, error } = await supabase
    .from("songs")
    .select("id, title, artist, album, cover_url")
    .is("deezer_id", null);
  if (error) throw error;

  let matched = 0;
  const missed = [];
  for (const row of rows) {
    const track = await findTrack(row.title, row.artist);
    if (!track) {
      missed.push(`${row.artist} — ${row.title}`);
      continue;
    }
    if (track.title !== row.title) approximate.push(`songs: ${row.artist} — ${row.title}  →  ${track.title} (${track.album?.title ?? "?"})`);
    const changes = { deezer_id: String(track.id) };
    if (!row.album && track.album?.title) changes.album = track.album.title;
    if ((!row.cover_url || isSpotifyCover(row.cover_url)) && track.album?.cover_xl) {
      changes.cover_url = track.album.cover_xl;
    }
    if (await update("songs", row.id, changes)) matched++;
  }
  report.push({ table: "songs", total: rows.length, matched, missed });
}

async function backfillAlbums(table, { withFavoriteTrack = false } = {}) {
  const columns = ["id", "album_name", "artist_name", "cover_url"];
  if (withFavoriteTrack) columns.push("favorite_track_name");
  const { data: rows, error } = await supabase.from(table).select(columns.join(", ")).is("deezer_id", null);
  if (error) throw error;

  let matched = 0;
  const missed = [];
  for (const row of rows) {
    const album = await findAlbum(row.album_name, row.artist_name);
    if (!album) {
      missed.push(`${row.artist_name} — ${row.album_name}`);
      continue;
    }
    if (album.title !== row.album_name) approximate.push(`${table}: ${row.artist_name} — ${row.album_name}  →  ${album.title}`);
    const changes = { deezer_id: String(album.id) };
    if ((!row.cover_url || isSpotifyCover(row.cover_url)) && album.cover_xl) {
      changes.cover_url = album.cover_xl;
    }
    if (withFavoriteTrack && row.favorite_track_name) {
      const tracks = await deezer(`/album/${album.id}/tracks?limit=200`);
      const favorite = (tracks?.data ?? []).find(
        (track) => normalize(track.title) === normalize(row.favorite_track_name)
      );
      if (favorite) changes.favorite_track_deezer_id = String(favorite.id);
    }
    if (await update(table, row.id, changes)) matched++;
  }
  report.push({ table, total: rows.length, matched, missed });
}

console.log(APPLY ? "Mode ecriture (--apply)\n" : "Mode a blanc : rien n'est ecrit. Relancer avec --apply.\n");

await backfillSongs();
await backfillAlbums("album_reviews", { withFavoriteTrack: true });
await backfillAlbums("album_wishlist");
await backfillAlbums("favorite_albums");

for (const { table, total, matched, missed } of report) {
  console.log(`${table}: ${matched}/${total} retrouves sur Deezer`);
  for (const line of missed) console.log(`  - introuvable : ${line}`);
}

if (approximate.length > 0) {
  console.log(`\nCorrespondances approchees (${approximate.length}) :`);
  for (const line of approximate) console.log(`  ${line}`);
}
