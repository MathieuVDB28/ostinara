"use client";

import { useState, useCallback } from "react";
import { Gauge, Timer } from "lucide-react";
import { useRouter } from "next/navigation";
import { Metronome } from "@/components/practice/metronome/metronome";
import { ExerciseList } from "@/components/practice/exercises/exercise-list";
import { ExerciseDetailModal } from "@/components/practice/exercises/exercise-detail-modal";
import { ExerciseProgress } from "@/components/practice/exercises/exercise-progress";
import { CreateExerciseModal } from "@/components/practice/exercises/create-exercise-modal";
import { SongSelector } from "@/components/practice/song-practice/song-selector";
import { BpmTargetIndicator } from "@/components/practice/song-practice/bpm-target-indicator";
import { TunerSheet } from "@/components/audio/tuner-sheet";
import { SongTabPanel } from "@/components/practice/song-practice/song-tab-panel";
import { ResumeCard } from "./resume-card";
import { CarnetView } from "./carnet-view";
import { usePracticeSession } from "@/components/providers/practice-session-provider";
import { updateSong } from "@/lib/actions/songs";
import { songTargetBpm, slowPracticeFloor } from "@/lib/song-progress";
import type {
  Song,
  ExerciseWithProgress,
  HeatmapData,
  SongPracticeStats,
  PracticeSessionWithSong,
  PracticeStats,
  UserPlan,
  WeeklyPlan,
} from "@/types";

type PlayTab = "carnet" | "song" | "exercises";

/*
 * Deux segments, pas trois. L'accordeur etait le seul onglet qui ne
 * decrivait pas une facon de travailler mais un outil ponctuel : il
 * remplacait tout le contenu, metronome compris, pour une action de
 * trente secondes. Il vit maintenant dans une feuille (TunerSheet),
 * atteignable depuis l'en-tete quel que soit le segment actif.
 */
const TABS: { value: PlayTab; label: string }[] = [
  // Le Carnet ouvre l'onglet : ce qu'on a joue, et ce qu'on va jouer.
  { value: "carnet", label: "Carnet" },
  { value: "song", label: "Morceau" },
  { value: "exercises", label: "Exercices" },
];

/** Ce que la session plein ecran affiche du morceau. */
function sessionSong(song: Song | null) {
  return song ? { title: song.title, artist: song.artist, cover_url: song.cover_url ?? null } : null;
}

interface PlayViewProps {
  songs: Song[];
  exercises: ExerciseWithProgress[];
  songPracticeStats: Record<string, SongPracticeStats>;
  currentFocus: Song | null;
  focusBestBpm: number | null;
  /** La derniere session enregistree, pour reprendre sans rien ressaisir. */
  lastSession: PracticeSessionWithSong | null;
  /** Exercice a ouvrir a l'arrivee — lien profond de la recherche globale. */
  initialExerciseId?: string;
  /**
   * Morceau a ouvrir a l'arrivee (`/jouer?song=<id>`).
   *
   * C'est le lien que posent la bibliotheque et le plan de la semaine :
   * il ouvre le morceau avec sa tab, son tempo et le metronome deja cale.
   */
  initialSongId?: string;
  /** Le plan de la semaine — la raison de revenir le lundi. */
  weeklyPlan: WeeklyPlan | null;
  /** Les chiffres du Carnet. */
  practiceStats: PracticeStats;
  /** Quinze semaines de calendrier de pratique. */
  calendar: HeatmapData;
  recentSessions: PracticeSessionWithSong[];
  userPlan: UserPlan;
  isPaid: boolean;
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PlayView({
  songs,
  exercises,
  songPracticeStats,
  currentFocus,
  focusBestBpm,
  lastSession,
  initialExerciseId,
  initialSongId,
  weeklyPlan,
  practiceStats,
  calendar,
  recentSessions,
  userPlan,
  isPaid,
}: PlayViewProps) {
  const router = useRouter();

  // Arrivee depuis la recherche globale : l'exercice demande ouvre sa
  // fiche des le premier rendu, sur le bon segment.
  const initialExercise =
    exercises.find((exercise) => exercise.id === initialExerciseId) ?? null;

  // Les segments de "Jouer" sont du state, pas des routes : le metronome
  // et le chrono doivent survivre au passage d'un segment a l'autre.
  const [activeTab, setActiveTab] = useState<PlayTab>(() => {
    if (initialExercise) return "exercises";
    // `/jouer?song=<id>` vient de la bibliotheque ou du plan : on veut
    // jouer ce morceau, pas relire le carnet.
    if (initialSongId && songs.some((song) => song.id === initialSongId)) return "song";
    return "carnet";
  });

  // Le chrono vient du contexte : il survit a la navigation et sa barre
  // de controle le suit d'un ecran a l'autre.
  const practiceSession = usePracticeSession();
  const isPracticing = practiceSession.isActive;

  /*
   * Le morceau ouvert a l'arrivee.
   *
   * `?song=<id>` gagne sur « le morceau en cours » : c'est un choix
   * explicite — un clic depuis la bibliotheque ou depuis un objectif de la
   * semaine — alors que `currentFocus` n'est qu'un defaut.
   */
  const deepLinkedSong =
    songs.find((song) => song.id === initialSongId) ?? null;

  const [selectedSong, setSelectedSong] = useState<Song | null>(
    deepLinkedSong ?? currentFocus
  );
  const [selectedExercise, setSelectedExercise] =
    useState<ExerciseWithProgress | null>(initialExercise);
  const [exerciseModalOpen, setExerciseModalOpen] = useState(
    Boolean(initialExercise)
  );
  const [createExerciseModalOpen, setCreateExerciseModalOpen] = useState(false);

  /**
   * Le tempo auquel on ouvre un morceau.
   *
   * On reprend la ou on s'est arrete (le meilleur tempo tenu), pas au
   * tempo du disque : caler le metronome sur 168 BPM quand on passe le
   * morceau a 104 n'aide personne. Sans historique, on part du travail
   * lent — 60 % de la cible.
   */
  const workingBpmFor = useCallback(
    (song: Song): number | null => {
      const best = songPracticeStats[song.id]?.bestBpm ?? null;
      if (best) return best;
      const target = songTargetBpm(song);
      return target ? slowPracticeFloor(target.bpm) : null;
    },
    [songPracticeStats]
  );

  const initialBpm = deepLinkedSong ? workingBpmFor(deepLinkedSong) ?? 120 : 120;

  const [currentBpm, setCurrentBpm] = useState(initialBpm);
  const [tunerOpen, setTunerOpen] = useState(false);

  // Le metronome porte son propre tempo : le regler depuis l'exterieur
  // demande une requete explicite, sinon « Reprendre a 96 BPM » lancerait
  // le chrono en laissant le metronome sur 120.
  const [bpmRequest, setBpmRequest] = useState<{ bpm: number; id: number } | null>(
    // Arrive par lien profond : le metronome est cale des le premier rendu.
    // Passer par un effet ferait battre 120 BPM pendant une frame.
    deepLinkedSong && initialBpm ? { bpm: initialBpm, id: 0 } : null
  );


  /*
   * Le morceau qu'on reprend vient de la derniere session enregistree,
   * pas du premier morceau « en cours » de la bibliotheque : c'est ce
   * qu'on travaillait, dans l'ordre ou on l'a travaille.
   *
   * Le morceau peut avoir ete supprime depuis (`song` a null) : on retombe
   * alors sur la carte « En cours ».
   */
  const resumeSong = lastSession?.song ?? null;

  const resumeTargetBpm = resumeSong
    ? songTargetBpm(resumeSong)?.bpm
    : undefined;

  // Le tempo atteint la derniere fois est le bon point de reprise. Sans
  // lui, la cible du morceau ; sans cible, le metronome ne bouge pas.
  const resumeBpm =
    lastSession?.bpm_achieved ??
    songPracticeStats[resumeSong?.id ?? ""]?.bestBpm ??
    resumeTargetBpm ??
    null;

  const handleResume = useCallback(() => {
    if (!resumeSong) return;

    setActiveTab("song");
    setSelectedSong(resumeSong);

    if (resumeBpm !== null) {
      setCurrentBpm(resumeBpm);
      setBpmRequest({ bpm: resumeBpm, id: Date.now() });
    }

    practiceSession.start({
      songId: resumeSong.id,
      exerciseId: null,
      bpm: resumeBpm ?? currentBpm,
      song: sessionSong(resumeSong),
      focus: true,
    });
  }, [practiceSession, resumeSong, resumeBpm, currentBpm]);

  const startSession = useCallback(() => {
    // Depuis le Carnet, la session porte le morceau ouvert dans
    // « Morceau » : c'est celui qu'on va jouer.
    const song = activeTab === "exercises" ? null : selectedSong;
    practiceSession.start({
      songId: song?.id ?? null,
      exerciseId: activeTab === "exercises" ? selectedExercise?.id ?? null : null,
      bpm: currentBpm,
      song: sessionSong(song),
      focus: true,
    });
  }, [practiceSession, activeTab, selectedSong, selectedExercise, currentBpm]);

  const handleStartExercisePractice = useCallback(
    (exercise: ExerciseWithProgress, bpm: number) => {
      setSelectedExercise(exercise);
      setCurrentBpm(bpm);
      setExerciseModalOpen(false);
      setActiveTab("exercises");
    },
    []
  );

  const handleUpdateTargetBpm = useCallback(
    async (songId: string, targetBpm: number) => {
      await updateSong(songId, { target_bpm: targetBpm });
      router.refresh();
    },
    [router]
  );

  /**
   * Choisir un morceau cale le metronome.
   *
   * C'etait le trou du pont annonce en v3.0 : on selectionnait un morceau
   * et le metronome restait sur 120, a charge pour le guitariste d'aller
   * lire le tempo ailleurs et de le ressaisir.
   */
  const handleSelectSong = useCallback(
    (song: Song | null) => {
      setSelectedSong(song);
      if (!song) return;
      const bpm = workingBpmFor(song);
      if (bpm !== null) {
        setCurrentBpm(bpm);
        setBpmRequest({ bpm, id: Date.now() });
      }
      // Le chrono deja lance doit suivre le morceau qu'on regarde.
      if (practiceSession.isActive) {
        practiceSession.setSongId(song.id, sessionSong(song));
        if (bpm !== null) practiceSession.setBpm(bpm);
      }
    },
    [workingBpmFor, practiceSession]
  );

  /** Regler le metronome depuis un panneau, sans changer de morceau. */
  const handleRequestBpm = useCallback((bpm: number) => {
    setCurrentBpm(bpm);
    setBpmRequest({ bpm, id: Date.now() });
  }, []);

  /** Un objectif de la semaine qui designe un morceau ouvre ce morceau. */
  const handleWorkOnSong = useCallback(
    (songId: string) => {
      const song = songs.find((item) => item.id === songId);
      if (!song) return;
      setActiveTab("song");
      handleSelectSong(song);
    },
    [songs, handleSelectSong]
  );

  const resumeCard =
    resumeSong && lastSession ? (
      <ResumeCard
        session={lastSession}
        song={resumeSong}
        bpm={resumeBpm}
        bestBpm={songPracticeStats[resumeSong.id]?.bestBpm ?? null}
        targetBpm={resumeTargetBpm}
        disabled={isPracticing}
        onResume={handleResume}
      />
    ) : null;

  return (
    <div className="space-y-6">
      {/*
        En-tete, style Atelier (docs/refonte-ui.md) : le titre en condense,
        l'accordeur et la session a droite. L'accordeur reste une feuille,
        pas un onglet : c'est un outil de trente secondes, pas une facon de
        travailler.
      */}
      <div>
        <div className="flex items-end justify-between gap-3">
          <h1 className="font-display text-[40px] font-extrabold uppercase leading-none tracking-[0.01em] lg:text-5xl">
            Jouer
          </h1>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTunerOpen(true)}
              aria-haspopup="dialog"
              className="flex min-h-[38px] items-center gap-1.5 rounded-full border border-border px-3.5 text-[13px] font-semibold transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Gauge className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              Accorder
            </button>

            {isPracticing ? (
              /*
                Session en cours : le chrono rouvre le plein ecran. Les
                commandes sont la-bas et dans la barre du bas, pas ici.
              */
              <button
                onClick={practiceSession.openFocus}
                className="flex min-h-[38px] items-center gap-1.5 rounded-full bg-foreground px-3.5 text-background"
              >
                <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />
                <span className="tabular font-display text-lg font-bold leading-none">
                  {formatDuration(practiceSession.elapsedSeconds)}
                </span>
                <span className="sr-only">Afficher la session en plein écran</span>
              </button>
            ) : (
              activeTab !== "carnet" && (
                <button
                  onClick={startSession}
                  className="hidden min-h-[38px] items-center gap-1.5 rounded-full border border-border px-3.5 text-[13px] font-semibold transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex"
                >
                  <Timer className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  Démarrer une session
                </button>
              )
            )}
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Sections Jouer"
          className="-mx-4 mt-4 flex gap-6 overflow-x-auto border-b border-border px-4 [-ms-overflow-style:none] [scrollbar-width:none] lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {TABS.map((tab) => (
            <button
              key={tab.value}
              role="tab"
              aria-selected={activeTab === tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`min-h-[40px] shrink-0 whitespace-nowrap pb-2.5 pt-1 text-sm font-semibold transition-colors ${
                activeTab === tab.value
                  ? "text-foreground shadow-[inset_0_-2px_0_var(--foreground)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "carnet" && (
        <CarnetView
          stats={practiceStats}
          calendar={calendar}
          recentSessions={recentSessions}
          weeklyPlan={weeklyPlan}
          resume={resumeCard}
          focusSong={currentFocus}
          focusBestBpm={focusBestBpm}
          isPracticing={isPracticing}
          onStartSession={startSession}
          onWorkOnSong={handleWorkOnSong}
        />
      )}

      {/*
        Morceau et Exercices. Le metronome reste monte sur le Carnet,
        seulement masque : il continue de battre d'un onglet a l'autre.
      */}
      <div
        hidden={activeTab === "carnet"}
        className="grid gap-x-10 gap-y-6 lg:grid-cols-[400px_1fr]"
      >
        {!isPracticing && (
          <button
            onClick={startSession}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold transition-colors hover:bg-accent sm:hidden"
          >
            <Timer className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            Démarrer une session
          </button>
        )}
        <Metronome
          initialBpm={currentBpm}
          bpmRequest={bpmRequest}
          onBpmChange={setCurrentBpm}
          onPlayingChange={() => {}}
        />

        <div className="min-w-0">
          {activeTab === "song" && (
            <div className="space-y-5">
              {selectedSong ? (
                <>
                  <BpmTargetIndicator
                    song={selectedSong}
                    currentBpm={currentBpm}
                    practiceStats={songPracticeStats[selectedSong.id]}
                  />
                  {/*
                    La tab, le tempo de la partition et les sections, sur
                    le meme ecran que le metronome : c'est tout le pont
                    Songsterr/Spotify annonce en v3.0.
                  */}
                  <SongTabPanel
                    song={selectedSong}
                    currentBpm={currentBpm}
                    onRequestBpm={handleRequestBpm}
                    userPlan={userPlan}
                  />
                </>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Sélectionne un morceau pour voir ta progression
                </p>
              )}

              <SongSelector
                songs={songs}
                selectedSong={selectedSong}
                onSelectSong={handleSelectSong}
                onUpdateTargetBpm={handleUpdateTargetBpm}
              />
            </div>
          )}

          {activeTab === "exercises" && (
            <div className="space-y-4">
              {selectedExercise && isPracticing && (
                <ExerciseProgress
                  exercise={selectedExercise}
                  currentBpm={currentBpm}
                  className="mb-4"
                />
              )}

              <ExerciseList
                exercises={exercises}
                onSelectExercise={(exercise) => {
                  setSelectedExercise(exercise);
                  setExerciseModalOpen(true);
                }}
                onCreateExercise={() => setCreateExerciseModalOpen(true)}
              />
            </div>
          )}
        </div>
      </div>

      {selectedExercise && (
        <ExerciseDetailModal
          exercise={selectedExercise}
          isOpen={exerciseModalOpen}
          onClose={() => setExerciseModalOpen(false)}
          onStartPractice={handleStartExercisePractice}
        />
      )}

      <CreateExerciseModal
        isOpen={createExerciseModalOpen}
        onClose={() => setCreateExerciseModalOpen(false)}
      />

      <TunerSheet
        isOpen={tunerOpen}
        onClose={() => setTunerOpen(false)}
        isPaid={isPaid}
      />
    </div>
  );
}
