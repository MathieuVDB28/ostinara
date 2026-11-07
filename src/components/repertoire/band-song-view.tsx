"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Cover } from "@/components/ui/cover";
import { Icon } from "@/components/ui/icon";
import { deleteBandSong, saveMyBandSongNote } from "@/lib/actions/band-songs";
import { BAND_SONG_MEMBER_NOTE_MAX, formatMusicalKey, partsFromSections } from "@/lib/band-songs";
import { instrumentLabel } from "@/lib/instruments";
import { formatTimeAgo } from "@/lib/setlist-changes";
import { useIntlLocale } from "@/i18n/intl-locale";
import { BandSongForm } from "./band-song-form";
import type { BandSongDetails, BandSongMember } from "@/types";

const SECTION_TITLE =
  "border-b border-border pb-2 font-display text-[13px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground";
const LABEL = "font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground";

interface BandSongViewProps {
  bandId: string;
  bandName: string;
  details: BandSongDetails;
  currentUserId: string;
  readOnly: boolean;
}

/** La fiche d'un morceau du repertoire : ce que le groupe joue, et ou en est chacun. */
export function BandSongView({ bandId, bandName, details, currentUserId, readOnly }: BandSongViewProps) {
  const t = useTranslations("repertoire.fiche");
  const tr = useTranslations("repertoire");
  const tv = useTranslations("rehearsals.verdict");
  const intlLocale = useIntlLocale();
  const router = useRouter();
  const { song, members, lastVerdict, setlists, updatedBy } = details;
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Le moment du rendu, fige : « il y a 2 h » ne bouge pas a chaque rendu.
  const [renderedAt] = useState(() => Date.now());

  const musicalKey = formatMusicalKey(song.key_note, song.key_mode, tr);
  const parts = partsFromSections(song.structure);
  const author = updatedBy?.display_name || updatedBy?.username;
  const when = formatTimeAgo(song.updated_at, intlLocale, renderedAt);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    const result = await deleteBandSong(song.id);
    if (!result.success) {
      setError(result.error ?? null);
      setDeleting(false);
      return;
    }
    router.push(`/commu/groupes/${bandId}`);
  };

  const facts = [
    { label: t("key"), value: musicalKey },
    { label: t("tempo"), value: song.bpm ? tr("bpm", { bpm: song.bpm }) : null },
    { label: t("tuning"), value: song.tuning },
    { label: t("capo"), value: song.capo ? t("capoValue", { fret: song.capo }) : null },
  ];

  return (
    <div className="max-w-3xl space-y-8 pb-24">
      <div>
        <Link
          href={`/commu/groupes/${bandId}/repertoire`}
          className="-ml-1 mb-3 inline-flex min-h-[36px] items-center gap-1 rounded-lg px-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <Icon name="chevron_left" className="h-4 w-4" strokeWidth={2.25} />
          {bandName} · {tr("title")}
        </Link>
        <div className="flex items-end gap-4">
          <Cover src={song.cover_url} className="h-[72px] w-[72px] rounded-[4px]" />
          <div className="min-w-0 flex-1">
            <h1 className="text-balance font-display text-[40px] font-extrabold uppercase leading-[0.9]">{song.title}</h1>
            {song.artist && <p className="mt-1 truncate text-sm text-muted-foreground">{song.artist}</p>}
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {author ? t("updatedBy", { name: author, when }) : t("updated", { when })}
        </p>
        {readOnly && <p className="mt-2 text-sm text-muted-foreground">{tr("readOnly")}</p>}
      </div>

      {editing ? (
        <BandSongForm song={song} onCancel={() => setEditing(false)} />
      ) : (
        <>
          <section>
            <dl className="grid grid-cols-2 gap-x-4 border-t border-border sm:grid-cols-4">
              {facts.map((fact) => (
                <div key={fact.label} className="border-b border-border py-3">
                  <dt className={LABEL}>{fact.label}</dt>
                  <dd className={`mt-1 text-sm ${fact.value ? "font-semibold" : "text-muted-foreground"}`}>
                    {fact.value ?? t("unset")}
                  </dd>
                </div>
              ))}
            </dl>
            {(song.tabs_url || song.reference_url) && (
              <div className="flex flex-wrap gap-1.5 pt-3">
                {song.tabs_url && <ExternalChip href={song.tabs_url} label={t("tab")} />}
                {song.reference_url && <ExternalChip href={song.reference_url} label={t("reference")} />}
              </div>
            )}
          </section>

          <section>
            <h2 className={SECTION_TITLE}>{t("structure")}</h2>
            {parts.length > 0 ? (
              <ol className="flex flex-wrap gap-1.5 pt-3">
                {parts.map((part, index) => (
                  <li key={`${part.name}-${index}`} className="rounded-lg border border-border px-2.5 py-1.5 text-sm">
                    <span className="font-semibold">{part.name}</span>{" "}
                    <span className="text-xs text-muted-foreground">{t("measures", { count: part.measures })}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="py-3 text-sm text-muted-foreground">{t("structureEmpty")}</p>
            )}
          </section>

          <section>
            <h2 className={SECTION_TITLE}>{t("groupNotes")}</h2>
            {song.notes ? (
              <p className="whitespace-pre-line py-3 text-sm">{song.notes}</p>
            ) : (
              <p className="py-3 text-sm text-muted-foreground">{t("groupNotesEmpty")}</p>
            )}
          </section>

          {!readOnly && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setEditing(true)}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-border px-4 text-sm font-bold hover:bg-accent"
              >
                <Icon name="edit" className="h-4 w-4" />
                {t("edit")}
              </button>
            </div>
          )}
        </>
      )}

      <section>
        <h2 className={SECTION_TITLE}>{t("state")}</h2>
        <p className="py-3 text-sm">
          {lastVerdict
            ? t.rich("lastVerdict", {
                verdict: tv(lastVerdict.verdict),
                date: new Date(lastVerdict.date).toLocaleDateString(intlLocale, { day: "numeric", month: "long" }),
                strong: (chunks) => <strong>{chunks}</strong>,
              })
            : <span className="text-muted-foreground">{t("noVerdict")}</span>}
        </p>
        <h3 className={`mt-2 ${LABEL}`}>{t("posts")}</h3>
        <ul>
          {members.map((member) => (
            <MemberRow
              key={member.user_id}
              songId={song.id}
              member={member}
              mine={member.user_id === currentUserId}
              readOnly={readOnly}
            />
          ))}
        </ul>
      </section>

      <section>
        <h2 className={SECTION_TITLE}>{t("inSetlists")}</h2>
        {setlists.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5 pt-3">
            {setlists.map((setlist) => (
              <li key={setlist.id}>
                <Link
                  href={`/setlists/${setlist.id}`}
                  className="inline-flex min-h-[36px] items-center rounded-full border border-border px-3 text-[13px] font-semibold hover:bg-accent"
                >
                  {setlist.name}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-3 text-sm text-muted-foreground">{t("noSetlist")}</p>
        )}
      </section>

      {!readOnly && !editing && (
        <section className="border-t border-border pt-4">
          {confirmDelete ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="min-w-0 flex-1 basis-56 text-sm text-destructive">{t("deleteConfirm")}</p>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="min-h-[44px] rounded-xl bg-destructive px-4 text-sm font-bold text-white disabled:opacity-50"
              >
                {deleting ? t("deleting") : t("confirmDelete")}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="min-h-[44px] rounded-xl border border-border px-4 text-sm font-bold hover:bg-accent"
              >
                {t("cancel")}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-destructive"
            >
              <Icon name="delete" className="h-4 w-4" />
              {t("delete")}
            </button>
          )}
          {error && (
            <p role="alert" className="mt-2 text-sm font-semibold text-destructive">
              {error}
            </p>
          )}
        </section>
      )}
    </div>
  );
}

function ExternalChip({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-border px-3.5 text-[13px] font-semibold hover:bg-accent"
    >
      <Icon name="open_in_new" className="h-4 w-4" />
      {label}
    </a>
  );
}

/** Un musicien : son poste, ou il en est, et sa note. La sienne se modifie sur place. */
function MemberRow({
  songId,
  member,
  mine,
  readOnly,
}: {
  songId: string;
  member: BandSongMember;
  mine: boolean;
  readOnly: boolean;
}) {
  const t = useTranslations("repertoire.fiche");
  const te = useTranslations("enums");
  const router = useRouter();
  const [note, setNote] = useState(member.note ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const name = member.profile?.display_name || member.profile?.username || "";
  const poste = member.instrument
    ? instrumentLabel({ instrument: member.instrument, custom_label: member.instrument_label ?? undefined }, te)
    : null;
  const state = member.in_library && member.status
    ? `${te(`songStatus.${member.status}`)}${member.progress_percent ? ` · ${member.progress_percent} %` : ""}`
    : t("notInLibrary");
  const changed = note.trim() !== (member.note ?? "");

  const save = async () => {
    setSaving(true);
    setMessage(null);
    const result = await saveMyBandSongNote(songId, note);
    setSaving(false);
    setMessage(result.success ? { ok: true, text: t("noteSaved") } : { ok: false, text: result.error ?? "" });
    if (result.success) router.refresh();
  };

  return (
    <li className="border-b border-border py-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate text-sm">
          <span className="font-semibold">{name}</span>
          {poste && <span className="text-muted-foreground"> · {poste}</span>}
        </p>
        <span className="shrink-0 text-xs text-muted-foreground">{state}</span>
      </div>
      {mine && !readOnly ? (
        <div className="mt-2">
          <label htmlFor={`my-note-${songId}`} className="sr-only">
            {t("myNote")}
          </label>
          <textarea
            id={`my-note-${songId}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={BAND_SONG_MEMBER_NOTE_MAX}
            rows={3}
            placeholder={t("notePlaceholder")}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-primary"
          />
          <div className="mt-1 flex items-center gap-3">
            <button
              onClick={save}
              disabled={saving || !changed}
              className="min-h-[40px] rounded-xl border border-border px-3.5 text-[13px] font-bold hover:bg-accent disabled:opacity-40"
            >
              {saving ? t("savingNote") : t("saveNote")}
            </button>
            {message && (
              <p role="status" className={`text-xs ${message.ok ? "text-muted-foreground" : "font-semibold text-destructive"}`}>
                {message.text}
              </p>
            )}
          </div>
        </div>
      ) : member.note ? (
        <p className="mt-1 whitespace-pre-line text-sm">{member.note}</p>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">{t("noNote")}</p>
      )}
    </li>
  );
}
