"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { ALL_EXERCISE_CATEGORIES } from "@/lib/instruments";
import { getSongs } from "@/lib/actions/songs";
import { addSetlistItem } from "@/lib/actions/setlists";
import { getExercises } from "@/lib/actions/exercises";
import {
  SECTION_PRESETS,
  type Song,
  type Profile,
  type ExerciseWithProgress,
  type ExerciseCategory,
} from "@/types";

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  setlistId: string;
  position: number;
  songSources: { member: Profile | null; songs: Song[] }[];
}

type Tab = "song" | "section" | "exercise";

export function AddItemModal({
  isOpen,
  onClose,
  onSuccess,
  setlistId,
  position,
  songSources,
}: AddItemModalProps) {
  const t = useTranslations("setlists.add");
  const tp = useTranslations("setlists.presets");
  const tc = useTranslations("common");
  const te = useTranslations("enums");
  const [tab, setTab] = useState<Tab>("song");
  const [query, setQuery] = useState("");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogResults, setCatalogResults] = useState<
    { title: string; artist: string; cover_url?: string }[]
  >([]);
  const [searchingCatalog, setSearchingCatalog] = useState(false);
  const [customSection, setCustomSection] = useState("");
  const [sectionDuration, setSectionDuration] = useState(0);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Onglet Exercice
  const [exercises, setExercises] = useState<ExerciseWithProgress[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [exerciseQuery, setExerciseQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ExerciseCategory | null>(
    null
  );
  // Exo express (saisie libre)
  const [expressName, setExpressName] = useState("");
  const [expressCategory, setExpressCategory] = useState<ExerciseCategory | "">(
    ""
  );
  const [expressDuration, setExpressDuration] = useState(0);
  const [expressBpm, setExpressBpm] = useState(0);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setTab("song");
      setQuery("");
      setCatalogQuery("");
      setCatalogResults([]);
      setCustomSection("");
      setSectionDuration(0);
      setExerciseQuery("");
      setCategoryFilter(null);
      setExpressName("");
      setExpressCategory("");
      setExpressDuration(0);
      setExpressBpm(0);
      setError(null);
    }
  }, [isOpen]);

  // Charger la bibliotheque d'exercices a la premiere ouverture de l'onglet
  useEffect(() => {
    if (!isOpen || tab !== "exercise" || exercises.length > 0 || loadingExercises) {
      return;
    }
    setLoadingExercises(true);
    getExercises()
      .then(setExercises)
      .catch(() => setError(t("loadExercisesFailed")))
      .finally(() => setLoadingExercises(false));
  }, [isOpen, tab, exercises.length, loadingExercises, t]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Recherche dans le catalogue (Deezer)
  useEffect(() => {
    if (catalogQuery.length < 2) {
      setCatalogResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingCatalog(true);
      try {
        const res = await fetch(
          `/api/catalog/search?q=${encodeURIComponent(catalogQuery)}`
        );
        if (res.ok) {
          const data = await res.json();
          // L'API retourne déjà un array formaté avec title, artist, cover_url
          setCatalogResults(
            data.map(
              (track: {
                title: string;
                artist: string;
                cover_url?: string;
              }) => ({
                title: track.title,
                artist: track.artist,
                cover_url: track.cover_url,
              })
            ) || []
          );
        }
      } catch {
        console.error("Catalog search error");
      }
      setSearchingCatalog(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [catalogQuery]);

  if (!isOpen) return null;

  // Filter songs from library
  const allSongs = songSources.flatMap((source) =>
    source.songs.map((song) => ({
      ...song,
      owner: source.member,
    }))
  );

  const filteredSongs = query
    ? allSongs.filter(
        (song) =>
          song.title.toLowerCase().includes(query.toLowerCase()) ||
          song.artist.toLowerCase().includes(query.toLowerCase())
      )
    : allSongs;

  const handleAddSong = async (
    song: Song & { owner: Profile | null }
  ) => {
    setAdding(true);
    setError(null);

    const result = await addSetlistItem({
      setlist_id: setlistId,
      position,
      item_type: "song",
      song_id: song.id,
      song_title: song.title,
      song_artist: song.artist,
      song_cover_url: song.cover_url,
      song_owner_id: song.owner?.id,
    });

    setAdding(false);

    if (result.success) {
      onSuccess();
      onClose();
    } else {
      setError(result.error || tc("genericError"));
    }
  };

  const handleAddCatalogSong = async (song: {
    title: string;
    artist: string;
    cover_url?: string;
  }) => {
    setAdding(true);
    setError(null);

    const result = await addSetlistItem({
      setlist_id: setlistId,
      position,
      item_type: "song",
      song_title: song.title,
      song_artist: song.artist,
      song_cover_url: song.cover_url,
    });

    setAdding(false);

    if (result.success) {
      onSuccess();
      onClose();
    } else {
      setError(result.error || tc("genericError"));
    }
  };

  const handleAddSection = async (name: string) => {
    setAdding(true);
    setError(null);

    const result = await addSetlistItem({
      setlist_id: setlistId,
      position,
      item_type: "section",
      section_name: name,
      duration_seconds: sectionDuration > 0 ? sectionDuration * 60 : undefined,
    });

    setAdding(false);

    if (result.success) {
      onSuccess();
      onClose();
    } else {
      setError(result.error || tc("genericError"));
    }
  };

  // Exercice depuis la bibliotheque : on prefille BPM (cible) et duree
  const handleAddLibraryExercise = async (exercise: ExerciseWithProgress) => {
    setAdding(true);
    setError(null);

    const result = await addSetlistItem({
      setlist_id: setlistId,
      position,
      item_type: "exercise",
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      exercise_category: exercise.category,
      bpm: exercise.target_bpm || undefined,
      duration_seconds: exercise.duration_minutes
        ? exercise.duration_minutes * 60
        : undefined,
    });

    setAdding(false);

    if (result.success) {
      onSuccess();
      onClose();
    } else {
      setError(result.error || tc("genericError"));
    }
  };

  // Exo express : nom libre, sans exercice source
  const handleAddExpressExercise = async () => {
    if (!expressName.trim()) return;
    setAdding(true);
    setError(null);

    const result = await addSetlistItem({
      setlist_id: setlistId,
      position,
      item_type: "exercise",
      exercise_name: expressName.trim(),
      exercise_category: expressCategory || undefined,
      bpm: expressBpm > 0 ? expressBpm : undefined,
      duration_seconds: expressDuration > 0 ? expressDuration * 60 : undefined,
    });

    setAdding(false);

    if (result.success) {
      onSuccess();
      onClose();
    } else {
      setError(result.error || tc("genericError"));
    }
  };

  const filteredExercises = exercises.filter((ex) => {
    if (categoryFilter && ex.category !== categoryFilter) return false;
    if (
      exerciseQuery &&
      !ex.name.toLowerCase().includes(exerciseQuery.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card shadow-md">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-display text-3xl font-extrabold uppercase leading-none">{t("title")}</h2>
          <button aria-label={tc("close")}
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border px-4">
          <button
            onClick={() => setTab("song")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === "song"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
            {t("song")}
          </button>
          <button
            onClick={() => setTab("section")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === "section"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16m-7 6h7"
              />
            </svg>
            {t("section")}
          </button>
          <button
            onClick={() => setTab("exercise")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === "exercise"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.5 6.5l11 11m-9-13l2 2m-4 0l4 4m9 1l-2-2m4 0l-4-4M3 21l2-2m14-14l2-2"
              />
            </svg>
            {t("exercise")}
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {tab === "song" ? (
            <div className="space-y-4">
              {/* Library search */}
              <div>
                <label className="mb-2 block text-sm font-medium">
                  {t("fromLibrary")}
                </label>
                <div className="relative">
                  <svg
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("searchSong")}
                    className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-4 text-sm focus:border-primary"
                  />
                </div>
                <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                  {filteredSongs.slice(0, 10).map((song) => (
                    <button
                      key={song.id}
                      onClick={() => handleAddSong(song)}
                      disabled={adding}
                      className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-accent disabled:opacity-50"
                    >
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
                        {song.cover_url ? (
                          <img
                            src={song.cover_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium">
                          {song.title}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {song.artist}
                          {song.owner && ` • ${song.owner.display_name || song.owner.username}`}
                        </p>
                      </div>
                    </button>
                  ))}
                  {filteredSongs.length === 0 && query && (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      {t("noSong")}
                    </p>
                  )}
                </div>
              </div>

              {/* Recherche dans le catalogue */}
              <div className="border-t border-border pt-4">
                <label className="mb-2 block text-sm font-medium">
                  {t("fromDeezer")}
                </label>
                <div className="relative">
                  <svg
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    value={catalogQuery}
                    onChange={(e) => setCatalogQuery(e.target.value)}
                    placeholder={t("searchDeezer")}
                    className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-4 text-sm focus:border-primary"
                  />
                </div>
                <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                  {searchingCatalog && (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      {t("searching")}
                    </p>
                  )}
                  {catalogResults.map((song, i) => (
                    <button
                      key={i}
                      onClick={() => handleAddCatalogSong(song)}
                      disabled={adding}
                      className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-accent disabled:opacity-50"
                    >
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
                        {song.cover_url ? (
                          <img
                            src={song.cover_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-success">
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium">
                          {song.title}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {song.artist}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : tab === "section" ? (
            <div className="space-y-4">
              {/* Preset sections */}
              <div>
                <label className="mb-2 block text-sm font-medium">
                  {t("presets")}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SECTION_PRESETS.map((preset) => (
                    <button
                      key={preset.key}
                      onClick={() => handleAddSection(tp(preset.key))}
                      disabled={adding}
                      className={`flex items-center gap-2 rounded-lg p-3 text-left transition-colors ${preset.color} hover:opacity-80 disabled:opacity-50`}
                    >
                      <span className="font-medium">{tp(preset.key)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom section */}
              <div className="border-t border-border pt-4">
                <label className="mb-2 block text-sm font-medium">
                  {t("custom")}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customSection}
                    onChange={(e) => setCustomSection(e.target.value)}
                    placeholder={t("sectionName")}
                    className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
                  />
                  <button
                    onClick={() => handleAddSection(customSection)}
                    disabled={adding || !customSection.trim()}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
                  >
                    {tc("add")}
                  </button>
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="mb-1 block text-sm font-medium">
                  {t("durationOptional")}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={sectionDuration || ""}
                    onChange={(e) =>
                      setSectionDuration(parseInt(e.target.value) || 0)
                    }
                    placeholder="0"
                    min="0"
                    className="w-20 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
                  />
                  <span className="text-sm text-muted-foreground">{t("minutes")}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Depuis la bibliotheque d'exercices */}
              <div>
                <label className="mb-2 block text-sm font-medium">
                  {t("fromExercises")}
                </label>

                {/* Filtres par categorie */}
                <div className="mb-2 flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setCategoryFilter(null)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      categoryFilter === null
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t("allCategories")}
                  </button>
                  {ALL_EXERCISE_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() =>
                        setCategoryFilter(categoryFilter === cat ? null : cat)
                      }
                      className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                        categoryFilter === cat
                          ? "bg-primary text-primary-foreground"
                          : "bg-accent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {te(`exerciseCategory.${cat}`)}
                    </button>
                  ))}
                </div>

                {/* Recherche */}
                <div className="relative">
                  <svg
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    value={exerciseQuery}
                    onChange={(e) => setExerciseQuery(e.target.value)}
                    placeholder={t("searchExercise")}
                    className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-4 text-sm focus:border-primary"
                  />
                </div>

                <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                  {loadingExercises && (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      {tc("loading")}
                    </p>
                  )}
                  {!loadingExercises &&
                    filteredExercises.slice(0, 20).map((exercise) => (
                      <button
                        key={exercise.id}
                        onClick={() => handleAddLibraryExercise(exercise)}
                        disabled={adding}
                        className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-accent disabled:opacity-50"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary/15 text-primary">
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6.5 6.5l11 11m-9-13l2 2m-4 0l4 4m9 1l-2-2m4 0l-4-4M3 21l2-2m14-14l2-2"
                            />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium">
                            {exercise.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {te(`exerciseCategory.${exercise.category}`)}
                            {exercise.target_bpm
                              ? ` • ${exercise.target_bpm} bpm`
                              : ""}
                            {exercise.is_from_friend && exercise.creator_name
                              ? ` • ${exercise.creator_name}`
                              : ""}
                          </p>
                        </div>
                      </button>
                    ))}
                  {!loadingExercises && filteredExercises.length === 0 && (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      {t("noExercise")}
                    </p>
                  )}
                </div>
              </div>

              {/* Exo express */}
              <div className="border-t border-border pt-4">
                <label className="mb-2 block text-sm font-medium">
                  {t("express")}
                </label>
                <input
                  type="text"
                  value={expressName}
                  onChange={(e) => setExpressName(e.target.value)}
                  placeholder={t("expressPlaceholder")}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
                />
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <select
                    value={expressCategory}
                    onChange={(e) =>
                      setExpressCategory(
                        e.target.value as ExerciseCategory | ""
                      )
                    }
                    className="rounded-lg border border-input bg-background px-2 py-2 text-sm focus:border-primary"
                  >
                    <option value="">{t("category")}</option>
                    {ALL_EXERCISE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {te(`exerciseCategory.${cat}`)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={expressDuration || ""}
                    onChange={(e) =>
                      setExpressDuration(parseInt(e.target.value) || 0)
                    }
                    placeholder={t("durationMin")}
                    min="0"
                    className="rounded-lg border border-input bg-background px-2 py-2 text-sm focus:border-primary"
                  />
                  <input
                    type="number"
                    value={expressBpm || ""}
                    onChange={(e) =>
                      setExpressBpm(parseInt(e.target.value) || 0)
                    }
                    placeholder={t("bpm")}
                    min="20"
                    max="300"
                    className="rounded-lg border border-input bg-background px-2 py-2 text-sm focus:border-primary"
                  />
                </div>
                <button
                  onClick={handleAddExpressExercise}
                  disabled={adding || !expressName.trim()}
                  className="mt-2 w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
                >
                  {t("addExercise")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
