"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import Link from "next/link";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useIntlLocale } from "@/i18n/intl-locale";
import { ListPlus, Music, Play, X } from "lucide-react";
import { updateSong, deleteSong } from "@/lib/actions/songs";
import { getCoversBySong, canUploadCover } from "@/lib/actions/covers";
// AddCoverModal entraine video-upload → tus-js-client, et video-upload
// charge lui-meme @ffmpeg a l'execution. Rien de tout cela n'est necessaire
// pour editer le titre d'un morceau.
const AddCoverModal = dynamic(() =>
  import("@/components/covers/add-cover-modal").then((m) => m.AddCoverModal)
);
const CoverDetailModal = dynamic(() =>
  import("@/components/covers/cover-detail-modal").then((m) => m.CoverDetailModal)
);
import { SongSessionsPanel } from "@/components/progress/song-sessions-panel";
const AddSessionModal = dynamic(() =>
  import("@/components/progress/add-session-modal").then((m) => m.AddSessionModal)
);
const AddToPlaylistModal = dynamic(() =>
  import("./add-to-playlist-modal").then((m) => m.AddToPlaylistModal)
);
import { DeezerPlayer } from "@/components/ui/deezer-player";
import { TabsSearchPanel } from "./tabs-search-panel";
import { TempoLadder } from "@/components/ui/tempo-ladder";
import { SongBpmCurve } from "@/components/progress/song-bpm-curve";
import { getSongBpmProgress } from "@/lib/actions/practice";
import { saveSongTabStructure } from "@/lib/actions/songs";
import { songTargetBpm, slowPracticeFloor } from "@/lib/song-progress";
import { useNextSteps } from "@/components/next-steps/next-steps-provider";
import { useMyInstruments } from "@/components/providers/instruments-provider";
import { instrumentLabel, instrumentMeta } from "@/lib/instruments";
import { InstrumentSwitch } from "@/components/instruments/instrument-switch";
import type {
  Instrument,
  Song,
  SongBpmPoint,
  SongDifficulty,
  SongStatus,
  SongsterrTabStructure,
  Cover,
  CoverWithSong,
  UserPlan,
} from "@/types";

interface EditSongModalProps {
  song: Song | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  onDelete?: (songId: string) => void;
  userPlan?: UserPlan;
  /** Meilleur tempo tenu en session — l'axe de la progression. */
  bestBpm?: number | null;
}

const STATUS_VALUES: SongStatus[] = ["want_to_learn", "learning", "mastered"];
const DIFFICULTY_VALUES: SongDifficulty[] = ["beginner", "intermediate", "advanced", "expert"];

import { TUNING_GROUPS } from "@/lib/tunings";
import { Icon } from "@/components/ui/icon";

export function EditSongModal({
  song,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  userPlan = "free",
  bestBpm = null,
}: EditSongModalProps) {
  const t = useTranslations("library.sheet");
  const tl = useTranslations("library");
  const tc = useTranslations("common");
  const te = useTranslations("enums");
  const intlLocale = useIntlLocale();
  const statusOptions = STATUS_VALUES.map((value) => ({ value, label: te(`songStatus.${value}`) }));
  const difficultyOptions: { value: SongDifficulty | ""; label: string }[] = [
    { value: "", label: tl("song.undefined") },
    ...DIFFICULTY_VALUES.map((value) => ({ value, label: te(`difficulty.${value}`) })),
  ];
  const router = useRouter();
  const nextSteps = useNextSteps();
  const myInstruments = useMyInstruments();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "tablatures" | "covers" | "sessions">("details");

  // Covers state
  const [covers, setCovers] = useState<Cover[]>([]);
  const [loadingCovers, setLoadingCovers] = useState(false);
  const [showAddCover, setShowAddCover] = useState(false);
  const [selectedCover, setSelectedCover] = useState<CoverWithSong | null>(null);
  const [canUpload, setCanUpload] = useState<{ allowed: boolean; limit?: number; current?: number }>({ allowed: true });

  // Sessions state
  const [showAddSession, setShowAddSession] = useState(false);
  const [sessionsPanelKey, setSessionsPanelKey] = useState(0);

  // Playlist state
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [difficulty, setDifficulty] = useState<SongDifficulty | "">("");
  /*
   * Un statut par instrument (song_parts). Un instrument encore jamais
   * travaille sur ce morceau n'a pas de statut tant qu'on n'en choisit pas.
   */
  const [partStatuses, setPartStatuses] = useState<Partial<Record<Instrument, SongStatus>>>({});
  /*
   * Le curseur « 0-100 % » a disparu. Ce qu'un guitariste decide a propos
   * d'un morceau, c'est un tempo a atteindre ; ce qu'il constate, c'est le
   * tempo qu'il tient. Le pourcentage se deduit des deux, il ne se saisit
   * plus (cf. syncSongProgressFromTempo).
   */
  const [targetBpm, setTargetBpm] = useState("");
  const [bpmPoints, setBpmPoints] = useState<SongBpmPoint[] | null>(null);
  // Plusieurs instruments : la courbe et le meilleur tempo d'un seul a la
  // fois, le principal d'abord.
  const [tempoInstrument, setTempoInstrument] = useState<Instrument>(myInstruments.primary);
  const [tabStructure, setTabStructure] = useState<SongsterrTabStructure | null>(
    null
  );
  const [tuning, setTuning] = useState("Standard");
  const [capo, setCapo] = useState(0);
  const [tabsUrl, setTabsUrl] = useState("");
  const [notes, setNotes] = useState("");

  // Sync form with song
  useEffect(() => {
    if (song) {
      setTitle(song.title);
      setArtist(song.artist);
      setDifficulty(song.difficulty || "");
      setPartStatuses(
        song.parts
          ? Object.fromEntries(song.parts.map((part) => [part.instrument, part.status]))
          : { [myInstruments.primary]: song.status }
      );
      setTargetBpm(song.target_bpm ? String(song.target_bpm) : "");
      setTabStructure(null);
      setTuning(song.tuning);
      setCapo(song.capo_position);
      setTabsUrl(song.tabs_url || "");
      setNotes(song.notes || "");
      setActiveTab("details");
    }
  }, [song]);

  /*
   * La courbe de tempo du morceau.
   *
   * Chargee a l'ouverture, en meme temps que les covers : c'est la
   * premiere chose qu'on vient regarder sur la fiche d'un morceau qu'on
   * travaille, et elle ne coute qu'une lecture de deux colonnes.
   */
  useEffect(() => {
    if (!song || !isOpen) return;
    let cancelled = false;
    getSongBpmProgress(song.id, myInstruments.isMulti ? tempoInstrument : undefined).then((points) => {
      if (!cancelled) setBpmPoints(points);
    });
    return () => {
      cancelled = true;
    };
  }, [song, isOpen, myInstruments.isMulti, tempoInstrument]);

  // Load covers for the song
  useEffect(() => {
    if (song && isOpen) {
      setLoadingCovers(true);
      Promise.all([getCoversBySong(song.id), canUploadCover()])
        .then(([coversData, uploadStatus]) => {
          setCovers(coversData);
          setCanUpload(uploadStatus);
        })
        .finally(() => setLoadingCovers(false));
    }
  }, [song, isOpen]);

  const loadCovers = async () => {
    if (!song) return;
    setLoadingCovers(true);
    const [coversData, uploadStatus] = await Promise.all([
      getCoversBySong(song.id),
      canUploadCover()
    ]);
    setCovers(coversData);
    setCanUpload(uploadStatus);
    setLoadingCovers(false);
  };

  // L'accordage parle aux cordes, le capo a la guitare seule. « Autre »
  // (ukulele, violon…) garde les deux.
  const showTuning = ["guitar", "bass", "other"].some((i) => myInstruments.plays(i as Instrument));
  const showCapo = ["guitar", "other"].some((i) => myInstruments.plays(i as Instrument));

  // Les instruments qu'on joue, plus ceux ou le morceau a deja une partie
  // (un ancien instrument principal, par exemple).
  const statusRows = [
    ...myInstruments.instruments,
    ...(song?.parts ?? [])
      .filter((part) => !myInstruments.plays(part.instrument))
      .map((part) => ({ instrument: part.instrument, custom_label: null })),
  ];

  const handleSave = async () => {
    if (!song) return;

    setSaving(true);
    setError(null);

    const parsedTarget = targetBpm ? parseInt(targetBpm, 10) : null;
    if (parsedTarget !== null && (isNaN(parsedTarget) || parsedTarget < 20 || parsedTarget > 300)) {
      setError(t("tempoRange"));
      setSaving(false);
      return;
    }

    let result = await updateSong(song.id, {
      title,
      artist,
      difficulty: difficulty || undefined,
      target_bpm: parsedTarget ?? undefined,
      tuning,
      capo_position: capo,
      tabs_url: tabsUrl || undefined,
      notes: notes || undefined,
    });

    // Puis chaque partie dont le statut a change : une activite par
    // instrument, comme une maitrise a la basse apres la guitare.
    const previous = (instrument: Instrument) =>
      song.parts ? song.parts.find((part) => part.instrument === instrument)?.status : song.status;
    const changed = (Object.entries(partStatuses) as [Instrument, SongStatus][]).filter(
      ([instrument, status]) => status !== previous(instrument)
    );
    for (const [instrument, status] of changed) {
      if (!result.success) break;
      result = await updateSong(song.id, { instrument, status });
    }

    if (result.success) {
      onUpdate();
      onClose();
      if (changed.some(([, status]) => status === "mastered") && song.status !== "mastered") {
        nextSteps.show({
          kind: "song_mastered",
          song: { ...song, title, artist, status: "mastered", progress_percent: 100 },
        });
      }
    } else {
      setError(result.error || tc("genericError"));
    }

    setSaving(false);
  };

  const handleDelete = async () => {
    if (!song) return;
    if (!confirm(t("confirmDelete"))) return;

    setDeleting(true);
    const result = await deleteSong(song.id);

    if (result.success) {
      if (onDelete) {
        onDelete(song.id);
      } else {
        onUpdate();
        onClose();
      }
    } else {
      setError(result.error || tc("genericError"));
      setDeleting(false);
    }
  };

  const handleClose = useCallback(() => {
    setError(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleClose]);

  if (!isOpen || !song) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center sm:items-center sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/*
        La fiche, style Etagere (docs/refonte-ui.md) : la pochette en grand
        comme une page d'album, puis une seule action en ambre — jouer le
        morceau. Plein ecran sur mobile, fenetre centree sur ordi.
      */}
      <div className="relative z-10 w-full overflow-y-auto bg-card sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl sm:border sm:border-border sm:shadow-md">
        <div className="relative h-[300px] overflow-hidden sm:h-[260px] sm:rounded-t-2xl">
          {song.cover_url ? (
            <Image
              src={song.cover_url}
              alt=""
              fill
              sizes="(min-width: 640px) 672px, 100vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted">
              <Music className="h-16 w-16 text-muted-foreground" strokeWidth={1.25} aria-hidden="true" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent via-40% to-card" />

          <button
            aria-label={tc("close")}
            onClick={handleClose}
            className="absolute left-4 top-[calc(env(safe-area-inset-top)+12px)] flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70 sm:left-auto sm:right-4 sm:top-4"
          >
            <X className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <div className="relative -mt-20 px-5 sm:px-6">
          <h2 className="text-balance text-[28px] font-extrabold leading-tight tracking-[-0.02em]">
            {song.title}
          </h2>
          <p className="font-semibold text-muted-foreground">
            {/* L'artiste mene a sa page : ce qu'on en joue, ses albums a ecouter. */}
            <Link
              href={`/artists/by-name?q=${encodeURIComponent(song.artist)}`}
              className="underline-offset-2 hover:text-foreground hover:underline"
            >
              {song.artist}
            </Link>
            {song.album && <span className="font-normal"> · {song.album}</span>}
          </p>
          {song.added_from && song.added_from_label && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {song.added_from === "album"
                ? t("fromAlbum", { label: song.added_from_label })
                : song.added_from === "friend"
                  ? t("fromFriend", { label: song.added_from_label })
                  : t("fromChallenge", { label: song.added_from_label })}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-1.5">
            {[
              statusOptions.find((option) => option.value === song.status)?.label,
              song.tuning,
              song.capo_position > 0 ? tl("capo", { position: song.capo_position }) : null,
              song.difficulty ? te(`difficulty.${song.difficulty}`) : null,
            ]
              .filter(Boolean)
              .map((label) => (
                <span
                  key={label}
                  className="rounded-md border border-border px-2 py-1 font-mono text-[11.5px] font-semibold text-muted-foreground"
                >
                  {label}
                </span>
              ))}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                router.push(`/jouer?song=${song.id}`);
              }}
              className="inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card sm:flex-none"
            >
              <Play className="h-4 w-4 fill-current" strokeWidth={0} aria-hidden="true" />
              {t("play")}
            </button>
            <button
              type="button"
              onClick={() => setShowAddToPlaylist(true)}
              aria-label={t("addToPlaylist")}
              className="inline-flex min-h-[46px] w-[46px] items-center justify-center rounded-xl border border-border transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ListPlus className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Lecteur Deezer */}
        {song.deezer_id && userPlan !== "free" && (
          <div className="mx-5 mt-4 sm:mx-6">
            <DeezerPlayer trackId={song.deezer_id} title={song.title} />
          </div>
        )}

        {/* Tabs */}
        <div
          role="tablist"
          aria-label={t("tabsAria")}
          className="mt-5 flex gap-6 overflow-x-auto border-b border-border px-5 [-ms-overflow-style:none] [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden"
        >
          {(
            [
              ["details", t("tabDetails")],
              ["tablatures", t("tabTabs")],
              ["covers", t("tabCovers")],
              ["sessions", t("tabSessions")],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              role="tab"
              aria-selected={activeTab === value}
              onClick={() => setActiveTab(value)}
              className={`flex shrink-0 items-center gap-1.5 pb-2.5 pt-1 text-sm font-semibold transition-colors ${
                activeTab === value
                  ? "text-foreground shadow-[inset_0_-2px_0_var(--foreground)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
              {value === "covers" && covers.length > 0 && (
                <span className="tabular text-xs text-muted-foreground">{covers.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Details Tab */}
        {activeTab === "details" && (
        <div className="space-y-6 p-6">
          {/* Statut, par instrument quand on en joue plusieurs */}
          <div>
            <span id="song-status-label" className="mb-2 block text-sm font-medium">{t("status")}</span>
            <div className="space-y-2.5" aria-labelledby="song-status-label" role="group">
              {statusRows.map((entry) => {
                const current = partStatuses[entry.instrument] ?? null;
                return (
                  <div key={entry.instrument} className={statusRows.length > 1 ? "flex items-center gap-3" : ""}>
                    {statusRows.length > 1 && (
                      <span className="flex w-28 shrink-0 items-center gap-1.5 truncate text-xs font-semibold text-muted-foreground">
                        <Icon name={instrumentMeta(entry.instrument).icon} className="h-3.5 w-3.5 shrink-0" />
                        {instrumentLabel(entry, te)}
                      </span>
                    )}
                    <div
                      role="radiogroup"
                      aria-label={t("statusFor", { instrument: instrumentLabel(entry, te) })}
                      className="grid flex-1 grid-cols-3 gap-0.5 rounded-xl border border-border bg-card p-[3px]"
                    >
                      {statusOptions.map((option) => (
                        <button
                          key={option.value}
                          role="radio"
                          aria-checked={current === option.value}
                          onClick={() =>
                            setPartStatuses((statuses) => ({ ...statuses, [entry.instrument]: option.value }))
                          }
                          className={`min-h-[36px] rounded-[9px] text-sm font-semibold transition-colors ${
                            current === option.value
                              ? "bg-secondary text-foreground shadow-[inset_0_0_0_1px_var(--border)]"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/*
            La progression, au tempo.

            C'etait un curseur 0-100 % : une valeur saisie une fois, jamais
            revue, et fausse des la deuxieme semaine. Ici, deux nombres qui
            existent : la cible qu'on se donne et le meilleur tempo tenu en
            session. Le reste — barre, pourcentage, courbe — n'est qu'une
            lecture de ces deux-la.
          */}
          {myInstruments.isMulti && (
            <InstrumentSwitch
              options={myInstruments.instruments}
              value={tempoInstrument}
              onChange={setTempoInstrument}
              label={t("tempoOf")}
            />
          )}
          <TempoBlock
            song={song}
            targetBpm={targetBpm}
            onTargetBpmChange={setTargetBpm}
            // Le meilleur tempo de la biblio melange les instruments : a
            // plusieurs, on le lit dans la courbe de l'instrument choisi.
            bestBpm={
              myInstruments.isMulti
                ? bpmPoints && bpmPoints.length > 0
                  ? Math.max(...bpmPoints.map((point) => point.bpm))
                  : null
                : bestBpm
            }
            points={bpmPoints}
          />

          {/* Basic info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">{t("title")}</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("artist")}</label>
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
              />
            </div>
          </div>

          {/* Reglages : accordage pour les cordes, capo pour la guitare */}
          <div className={`grid gap-4 ${showCapo ? "sm:grid-cols-3" : showTuning ? "sm:grid-cols-2" : ""}`}>
            <div>
              <label className="mb-1 block text-sm font-medium">{tl("song.difficulty")}</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as SongDifficulty)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
              >
                {difficultyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {showTuning && <div>
              <label className="mb-1 block text-sm font-medium">{tl("song.tuning")}</label>
              <select
                value={tuning}
                onChange={(e) => setTuning(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
              >
                {TUNING_GROUPS.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.tunings.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label} ({option.notes})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>}
            {showCapo && <div>
              <label className="mb-1 block text-sm font-medium">{tl("song.capo")}</label>
              <select
                value={capo}
                onChange={(e) => setCapo(parseInt(e.target.value))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
              >
                <option value={0}>{t("noCapo")}</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                  <option key={n} value={n}>
                    {t("fret", { n })}
                  </option>
                ))}
              </select>
            </div>}
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium">{t("personalNotes")}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("notesPlaceholder")}
              rows={4}
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 border-t border-border pt-4">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
            >
              {deleting ? tc("deleting") : tc("delete")}
            </button>
            <div className="flex-1" />
            <button
              onClick={handleClose}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
            >
              {tc("cancel")}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !title || !artist}
              // L'ambre est pris par « Jouer ce morceau » : l'enregistrement
              // passe a l'encre, toujours lisible comme l'action du formulaire.
              className="rounded-xl bg-foreground px-6 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? tc("savingShort") : tc("saveShort")}
            </button>
          </div>
        </div>
        )}

        {/* Tablatures Tab */}
        {activeTab === "tablatures" && (
          <div className="space-y-4 p-6">
            <TabsSearchPanel
              title={title}
              artist={artist}
              currentTabsUrl={tabsUrl}
              onSelectTab={(url) => setTabsUrl(url)}
              /*
                L'analyse etait calculee puis jetee : rouvrir le morceau
                relancait le telechargement du fichier Guitar Pro. Elle se
                range maintenant sur le morceau, et le tempo de la
                partition devient la cible quand aucune n'est reglee.
              */
              onTabStructure={async (structure, songsterrId) => {
                setTabStructure(structure);
                const saved = await saveSongTabStructure(song.id, {
                  songsterrId: songsterrId ?? null,
                  tabsUrl: tabsUrl || undefined,
                  structure,
                });
                if (saved.targetBpmApplied) {
                  setTargetBpm(String(saved.targetBpmApplied));
                }
                onUpdate();
              }}
              userPlan={userPlan}
            />

            <TabStructureSummary
              structure={
                tabStructure ??
                (song.tab_bpm
                  ? {
                      bpm: song.tab_bpm,
                      totalMeasures: song.tab_total_measures ?? 0,
                      timeSignatureBeats: song.tab_time_signature_beats ?? 4,
                      timeSignatureValue: song.tab_time_signature_value ?? 4,
                      sections: song.tab_sections ?? [],
                    }
                  : null)
              }
              syncedAt={song.tab_synced_at}
              onUseAsTarget={(bpm) => setTargetBpm(String(bpm))}
            />
          </div>
        )}

        {/* Covers Tab */}
        {activeTab === "covers" && (
          <div className="p-6">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("coversCount", { count: covers.length })}
                </p>
              </div>
              <button
                onClick={() => setShowAddCover(true)}
                disabled={!canUpload.allowed}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {tc("add")}
              </button>
            </div>

            {/* Limite message */}
            {!canUpload.allowed && (
              <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {t("coverLimit", { limit: canUpload.limit ?? 0 })}
              </div>
            )}

            {loadingCovers ? (
              <div className="flex items-center justify-center py-12">
                <svg className="h-8 w-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              </div>
            ) : covers.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {covers.map((cover) => (
                  <button
                    key={cover.id}
                    onClick={() => setSelectedCover({ ...cover, song })}
                    className="group relative overflow-hidden rounded-xl border border-border bg-muted text-left transition-all hover:border-primary/50"
                  >
                    <div className="relative aspect-video">
                      {cover.media_type === "video" ? (
                        <video
                          src={cover.media_url}
                          className="h-full w-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <svg className="h-10 w-10 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                          </svg>
                        </div>
                      )}
                      {/* Play overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/90 text-primary-foreground">
                          <svg className="h-5 w-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                      {/* Visibility badge */}
                      <div className="absolute left-2 top-2 rounded-full bg-background/80 px-2 py-1 text-xs backdrop-blur-sm">
                        {te(`visibility.${cover.visibility}`)}
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-muted-foreground">
                        {new Date(cover.created_at).toLocaleDateString(intlLocale, {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </p>
                      {cover.description && (
                        <p className="mt-1 truncate text-sm">{cover.description}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                  <svg className="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <path d="M10 9L15 12L10 15V9Z" fill="currentColor" stroke="none"/>
                  </svg>
                </div>
                <p className="text-sm text-muted-foreground">{t("noCovers")}</p>
                <button
                  onClick={() => setShowAddCover(true)}
                  disabled={!canUpload.allowed}
                  className="mt-3 text-sm font-medium text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                >
                  {t("addFirstCover")}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Sessions Tab */}
        {activeTab === "sessions" && (
          <div className="p-6">
            <SongSessionsPanel
              key={sessionsPanelKey}
              songId={song.id}
              onAddSession={() => setShowAddSession(true)}
            />
          </div>
        )}
      </div>

      {/* Add Cover Modal */}
      {showAddCover && (
      <AddCoverModal
        song={song}
        isOpen={showAddCover}
        onClose={() => setShowAddCover(false)}
        onSuccess={() => {
          loadCovers();
          onUpdate();
        }}
      />
      )}

      {/* Cover Detail Modal */}
      {selectedCover && (
      <CoverDetailModal
        cover={selectedCover}
        isOpen={!!selectedCover}
        onClose={() => setSelectedCover(null)}
        onUpdate={() => {
          loadCovers();
          onUpdate();
        }}
      />
      )}

      {/* Add Session Modal */}
      {showAddSession && (
      <AddSessionModal
        isOpen={showAddSession}
        onClose={() => setShowAddSession(false)}
        onSuccess={() => {
          setSessionsPanelKey(prev => prev + 1);
          router.refresh();
          onUpdate();
        }}
        songs={[song]}
        timerSong={song}
        mode="manual"
      />
      )}

      {/* Add to Playlist Modal */}
      {showAddToPlaylist && (
      <AddToPlaylistModal
        songId={song.id}
        isOpen={showAddToPlaylist}
        onClose={() => setShowAddToPlaylist(false)}
        onSuccess={() => {
          router.refresh();
          onUpdate();
        }}
      />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// La progression, au tempo
// ---------------------------------------------------------------------------

interface TempoBlockProps {
  song: Song;
  targetBpm: string;
  onTargetBpmChange: (value: string) => void;
  bestBpm: number | null;
  /** `null` tant que la courbe n'est pas revenue du serveur. */
  points: SongBpmPoint[] | null;
}

/**
 * Le bloc qui a remplace le curseur de progression.
 *
 * Trois choses, dans l'ordre ou on les consulte : ou j'en suis
 * (l'echelle de tempo), comment j'y suis arrive (la courbe), et ou je
 * veux aller (la cible, le seul champ de saisie).
 */
function TempoBlock({
  song,
  targetBpm,
  onTargetBpmChange,
  bestBpm,
  points,
}: TempoBlockProps) {
  const t = useTranslations("library.sheet");
  const parsed = targetBpm ? parseInt(targetBpm, 10) : NaN;
  const effectiveTarget = !isNaN(parsed) && parsed > 0 ? parsed : null;

  // Les propositions : la partition d'abord, l'enregistrement ensuite.
  // Ce sont des raccourcis, pas des valeurs imposees.
  const suggestions = [
    song.tab_bpm ? { bpm: song.tab_bpm, label: t("suggestionTab") } : null,
    song.spotify_bpm
      ? { bpm: Math.round(song.spotify_bpm), label: t("suggestionOriginal") }
      : null,
  ].filter(Boolean) as { bpm: number; label: string }[];

  const fallbackTarget = songTargetBpm(song);
  const ladderTarget = effectiveTarget ?? fallbackTarget?.bpm ?? null;

  return (
    <div className="space-y-4 rounded-xl border border-border p-4">
      {/* « Travailler » doublonnait « Jouer ce morceau », en tete de fiche. */}
      <h3 className="text-sm font-medium">{t("tempoProgress")}</h3>

      {ladderTarget ? (
        <TempoLadder
          targetBpm={ladderTarget}
          achievedBpm={bestBpm}
          floorBpm={slowPracticeFloor(ladderTarget)}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          {t("tempoHint")}
        </p>
      )}

      {/* La courbe : l'histoire, pas l'instantane. */}
      {points !== null && points.length > 0 && (
        <SongBpmCurve
          points={points}
          targetBpm={ladderTarget}
          floorBpm={ladderTarget ? slowPracticeFloor(ladderTarget) : null}
        />
      )}

      <div>
        <label
          htmlFor="target-bpm"
          className="mb-1 block text-sm font-medium"
        >
          {t("targetTempo")}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <input
              id="target-bpm"
              type="number"
              inputMode="numeric"
              min={20}
              max={300}
              value={targetBpm}
              onChange={(event) => onTargetBpmChange(event.target.value)}
              placeholder="—"
              className="tabular w-24 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
            />
            <span className="text-sm text-muted-foreground">BPM</span>
          </div>

          {suggestions.map((suggestion) => (
            <button
              key={suggestion.label}
              type="button"
              onClick={() => onTargetBpmChange(String(suggestion.bpm))}
              className="tabular inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-input px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {suggestion.label} · {suggestion.bpm}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {t("percentHint")}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ce que la tablature a livre
// ---------------------------------------------------------------------------

interface TabStructureSummaryProps {
  structure: SongsterrTabStructure | null;
  syncedAt?: string;
  onUseAsTarget: (bpm: number) => void;
}

/**
 * Le resultat de l'analyse, garde sur le morceau.
 *
 * Sans ca, « Analyser la tab » etait un bouton qui affichait un spinner
 * puis ne montrait rien : le tempo et les sections partaient dans un
 * callback que personne n'ecoutait sur cet ecran.
 */
function TabStructureSummary({
  structure,
  syncedAt,
  onUseAsTarget,
}: TabStructureSummaryProps) {
  const t = useTranslations("library.sheet");
  const intlLocale = useIntlLocale();
  if (!structure) return null;

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-sm font-medium">{t("tabSays")}</h4>
        {syncedAt && (
          <span className="text-xs text-muted-foreground">
            {t("analyzedOn", {
              date: new Date(syncedAt).toLocaleDateString(intlLocale, { day: "numeric", month: "short" }),
            })}
          </span>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-3">
        <div>
          <dt className="text-xs text-muted-foreground">{t("tempo")}</dt>
          <dd className="tabular text-lg font-bold text-primary">
            {structure.bpm}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t("timeSignature")}</dt>
          <dd className="tabular text-lg font-bold">
            {structure.timeSignatureBeats}/{structure.timeSignatureValue}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t("measures")}</dt>
          <dd className="tabular text-lg font-bold">
            {structure.totalMeasures || "—"}
          </dd>
        </div>
      </dl>

      {structure.sections.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-xs text-muted-foreground">
            {t("sections", { count: structure.sections.length })}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {structure.sections.map((section) => (
              <span
                key={`${section.name}-${section.startMeasure}`}
                className="tabular rounded-full bg-accent px-2.5 py-1 text-xs"
              >
                {section.name}
                <span className="text-muted-foreground">
                  {" "}
                  {section.startMeasure}–{section.endMeasure}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => onUseAsTarget(structure.bpm)}
        className="mt-3 inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Icon name="speed" className="h-[16px] w-[16px]" />
        {t("useAsTarget", { bpm: structure.bpm })}
      </button>
    </div>
  );
}
