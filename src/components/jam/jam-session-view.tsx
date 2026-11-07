"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useJamSession } from "@/lib/hooks/use-jam-session";
import { useWakeLock } from "@/lib/hooks/use-wake-lock";
import { JamMetronome } from "./jam-metronome";
import { JamChat } from "./jam-chat";
import { JamParticipants } from "./jam-participants";
import { JamSongQueue } from "./jam-song-queue";
import { JamSongSheet } from "./jam-song-sheet";
import { JamTabsViewer } from "./jam-tabs-viewer";
import { ChatSheet } from "@/components/ui/chat-sheet";
import { leaveJamSession, endJamSession } from "@/lib/actions/jam-sessions";
import { useMyInstruments } from "@/components/providers/instruments-provider";
import { bandPosteLabel } from "@/lib/instruments";
import type { JamSessionWithDetails, JamSessionMessageWithProfile, Profile, SetlistItem } from "@/types";

interface JamSessionViewProps {
  initialSession: JamSessionWithDetails;
  initialMessages: JamSessionMessageWithProfile[];
  currentUser: Profile;
}

export function JamSessionView({
  initialSession,
  initialMessages,
  currentUser,
}: JamSessionViewProps) {
  const t = useTranslations("jam.session");
  const tc = useTranslations("common");
  const te = useTranslations("enums");
  const router = useRouter();
  const isHost = initialSession.host_id === currentUser.id;

  // Le poste de chacun : celui qu'il tient dans le groupe, sinon (jam
  // perso) son instrument principal pour soi-meme.
  const myInstruments = useMyInstruments();
  const bandMembers = initialSession.band?.members ?? [];
  const myInstrument =
    bandMembers.find((member) => member.user_id === currentUser.id)?.instrument ?? myInstruments.primary;
  const postes = Object.fromEntries(
    bandMembers.map((member) => [member.user_id, bandPosteLabel(member, te)])
  ) as Record<string, string | null>;
  const isPersonalJam = !initialSession.band_id;

  const {
    session,
    isConnected,
    participants,
    messages,
    metronome,
    sharedNow,
    songStartAt,
    countInMeasures,
    setCountInMeasures,
    syncMetronome,
    toggleMetronome,
    stopMetronome,
    changeSong,
    updateSessionStatus,
    sendMessage,
  } = useJamSession({
    sessionId: initialSession.id,
    userId: currentUser.id,
    userProfile: {
      username: currentUser.username,
      display_name: currentUser.display_name || null,
      avatar_url: currentUser.avatar_url || null,
    },
    isHost,
    initialSession,
    initialMessages,
  });

  // L'appareil est pose sur un pupitre : personne ne touche l'ecran en jouant.
  useWakeLock(session.status !== "ended");

  // Sur telephone, le chat s'ouvre par-dessus le metronome : le compteur dit
  // qu'on a ecrit au groupe, sans son ni vibration.
  const [chatOpen, setChatOpen] = useState(false);
  const [seenMessages, setSeenMessages] = useState(initialMessages.length);
  const unread = chatOpen ? 0 : Math.max(0, messages.length - seenMessages);
  const toggleChat = () => {
    setSeenMessages(messages.length);
    setChatOpen((open) => !open);
  };

  const handleLeave = async () => {
    await leaveJamSession(initialSession.id);
    router.push("/commu/groupes");
  };

  const handleEnd = async () => {
    if (!isPersonalJam && !confirm(t("confirmEnd"))) return;
    await endJamSession(initialSession.id);
    router.push("/commu/groupes");
  };

  // Ce qui se joue dans la setlist : morceaux et exercices, pas les sections.
  const playable = (session.setlist?.items ?? []).filter(
    (item) => item.item_type === "song" || item.item_type === "exercise"
  );
  const currentIndex = session.current_song_index;
  const nextItem = currentIndex === null ? playable[0] : playable[currentIndex + 1];
  const nextIndex = currentIndex === null ? 0 : currentIndex + 1;

  /*
   * Changer de morceau (hote) : le metronome s'arrete et prend le tempo du
   * morceau. L'hote relance quand le groupe est pret, avec le decompte ; les
   * autres suivent par la synchro du metronome.
   */
  const selectSong = (index: number, item: SetlistItem) => {
    if (metronome.isPlaying) stopMetronome();
    if (item.bpm) metronome.setBpm(item.bpm);
    const isExercise = item.item_type === "exercise";
    changeSong(
      index,
      item.song_id || null,
      isExercise ? item.exercise_name || tc("exercise") : item.song_title || null,
      isExercise
        ? item.exercise_category
          ? te(`exerciseCategory.${item.exercise_category}`)
          : tc("exercise")
        : item.song_artist || null
    );
  };

  const nextTitle = nextItem
    ? nextItem.item_type === "exercise"
      ? nextItem.exercise_name || tc("exercise")
      : nextItem.song_title || ""
    : "";

  const handleStartSession = () => {
    updateSessionStatus("active");
  };

  const handlePauseSession = () => {
    updateSessionStatus("paused");
  };

  if (session.status === "ended") {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <svg
            className="h-8 w-8 text-muted-foreground"
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
        <h2 className="mb-2 font-display text-5xl font-extrabold uppercase leading-none">{t("ended")}</h2>
        <p className="text-muted-foreground mb-6">
          {isPersonalJam
            ? t("endedPersonal")
            : t("endedByHost")}
        </p>
        <button
          onClick={() => router.push("/commu/groupes")}
          className="rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground transition-all hover:opacity-90"
        >
          {t("back")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="shrink-0 border-b border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-3xl font-extrabold uppercase leading-none">
                {isPersonalJam ? t("solo") : t("band")}
              </h1>
              {session.band && (
                <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em]">
                  {session.band.name}
                </span>
              )}
              {isConnected ? (
                <span className="flex items-center gap-1.5 text-sm text-success">
                  <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  {t("connected")}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-sm text-primary">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  {t("connecting")}
                </span>
              )}
            </div>
            {session.current_song_title && (
              <p className="mt-1 text-sm text-muted-foreground">
                {t("nowPlaying", { title: session.current_song_title, artist: session.current_song_artist ?? "" })}
              </p>
            )}
            {isHost && nextItem && (
              <button
                type="button"
                onClick={() => selectSong(nextIndex, nextItem)}
                aria-label={t("nextSongAria", { title: nextTitle })}
                className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold transition-colors hover:bg-accent"
              >
                {t("nextSong")}
                <span className="max-w-[12rem] truncate font-normal text-muted-foreground">· {nextTitle}</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Session status badge */}
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                session.status === "active"
                  ? "bg-success/20 text-success"
                  : session.status === "paused"
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {session.status === "active"
                ? t("active")
                : session.status === "paused"
                ? t("paused")
                : t("waiting")}
            </span>

            {isHost ? (
              <>
                {session.status === "waiting" && (
                  <button
                    onClick={handleStartSession}
                    className="rounded-lg bg-success px-4 py-2 text-sm font-medium text-success-foreground transition-all hover:opacity-90"
                  >
                    {t("start")}
                  </button>
                )}
                {session.status === "active" && (
                  <button
                    onClick={handlePauseSession}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
                  >
                    {t("pause")}
                  </button>
                )}
                {session.status === "paused" && (
                  <button
                    onClick={handleStartSession}
                    className="rounded-lg bg-success px-4 py-2 text-sm font-medium text-success-foreground transition-all hover:opacity-90"
                  >
                    {t("resume")}
                  </button>
                )}
                <button
                  onClick={handleEnd}
                  className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-all hover:opacity-90"
                >
                  {t("end")}
                </button>
              </>
            ) : (
              <button
                onClick={handleLeave}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
              >
                {t("leave")}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div
        className={`flex-1 overflow-hidden ${
          isPersonalJam
            ? "flex flex-col"
            : "grid min-h-0 grid-rows-[minmax(0,1fr)] gap-4 lg:grid-cols-[1fr_350px]"
        }`}
      >
        {/* Main column */}
        <div className={`flex flex-col gap-4 overflow-auto p-4 ${isPersonalJam ? "" : "pb-24 lg:pb-4"}`}>
          {/* Metronome */}
          <JamMetronome
            metronome={metronome}
            isHost={isHost}
            onSync={syncMetronome}
            onToggle={toggleMetronome}
            countInMeasures={countInMeasures}
            onCountInChange={setCountInMeasures}
          />

          {/* La fiche du repertoire : tonalite et note de mon poste */}
          {session.setlist && session.current_song_index !== null && (
            <JamSongSheet item={playable[session.current_song_index] || null} bandId={session.band_id} />
          )}

          {/* Tabs viewer for current song */}
          {session.setlist && session.current_song_index !== null && (
            <JamTabsViewer
              currentItem={playable[session.current_song_index] || null}
              bpm={metronome.bpm}
              timeSignatureBeats={metronome.timeSignature.beats}
              isPlaying={metronome.isPlaying}
              songStartAt={songStartAt}
              now={sharedNow}
              instrument={myInstrument}
              isHost={isHost}
            />
          )}

          {/* Song queue if setlist */}
          {session.setlist && (
            <JamSongQueue
              setlist={session.setlist}
              currentIndex={session.current_song_index}
              isHost={isHost}
              onSongSelect={(index, item) => selectSong(index, item)}
            />
          )}
        </div>

        {/* Right column - Sidebar (only for band jams) */}
        {!isPersonalJam && (
          <div className="hidden min-h-0 flex-col gap-4 overflow-hidden border-l border-border p-4 lg:flex">
            {/* Participants */}
            <JamParticipants participants={participants} hostId={session.host_id} postes={postes} />

            {/* Chat */}
            <JamChat
              messages={messages}
              currentUserId={currentUser.id}
              onSendMessage={sendMessage}
            />
          </div>
        )}
      </div>

      {!isPersonalJam && !chatOpen && (
        <button
          type="button"
          onClick={toggleChat}
          className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-30 flex min-h-[48px] items-center gap-2 rounded-full bg-foreground px-4 text-sm font-semibold text-background shadow-lg lg:hidden"
        >
          <MessageCircle className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          {t("chat")}
          {unread > 0 && (
            <span className="tabular rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
              <span className="sr-only">{t("unread", { count: unread })}</span>
              <span aria-hidden="true">{unread}</span>
            </span>
          )}
        </button>
      )}

      {!isPersonalJam && chatOpen && (
        <ChatSheet title={t("chat")} closeLabel={t("closeChat")} onClose={toggleChat}>
          <div className="max-h-40 shrink-0 overflow-y-auto">
            <JamParticipants participants={participants} hostId={session.host_id} postes={postes} />
          </div>
          <JamChat messages={messages} currentUserId={currentUser.id} onSendMessage={sendMessage} />
        </ChatSheet>
      )}
    </div>
  );
}
