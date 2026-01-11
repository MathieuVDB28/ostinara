"use client";

import { useRouter } from "next/navigation";
import { useJamSession } from "@/lib/hooks/use-jam-session";
import { JamMetronome } from "./jam-metronome";
import { JamChat } from "./jam-chat";
import { JamParticipants } from "./jam-participants";
import { JamSongQueue } from "./jam-song-queue";
import { leaveJamSession, endJamSession } from "@/lib/actions/jam-sessions";
import type { JamSessionWithDetails, JamSessionMessageWithProfile, Profile } from "@/types";

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
  const router = useRouter();
  const isHost = initialSession.host_id === currentUser.id;

  const {
    session,
    isConnected,
    participants,
    messages,
    metronome,
    syncMetronome,
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

  const handleLeave = async () => {
    await leaveJamSession(initialSession.id);
    router.push("/setlists");
  };

  const handleEnd = async () => {
    if (!confirm("Terminer la Jam Session pour tout le monde ?")) return;
    await endJamSession(initialSession.id);
    router.push("/setlists");
  };

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
        <h2 className="text-2xl font-bold mb-2">Session terminee</h2>
        <p className="text-muted-foreground mb-6">
          La Jam Session a ete terminee par le host.
        </p>
        <button
          onClick={() => router.push("/setlists")}
          className="rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground transition-all hover:opacity-90"
        >
          Retour aux setlists
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="shrink-0 border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold">Jam Session</h1>
              <span className="rounded-full bg-primary/20 px-3 py-1 text-sm font-medium text-primary">
                {session.band.name}
              </span>
              {isConnected ? (
                <span className="flex items-center gap-1.5 text-sm text-green-500">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  Connecte
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-sm text-yellow-500">
                  <span className="h-2 w-2 rounded-full bg-yellow-500" />
                  Connexion...
                </span>
              )}
            </div>
            {session.current_song_title && (
              <p className="mt-1 text-sm text-muted-foreground">
                En cours : {session.current_song_title} -{" "}
                {session.current_song_artist}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Session status badge */}
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                session.status === "active"
                  ? "bg-green-500/20 text-green-400"
                  : session.status === "paused"
                  ? "bg-yellow-500/20 text-yellow-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {session.status === "active"
                ? "En cours"
                : session.status === "paused"
                ? "En pause"
                : "En attente"}
            </span>

            {isHost ? (
              <>
                {session.status === "waiting" && (
                  <button
                    onClick={handleStartSession}
                    className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-green-600"
                  >
                    Lancer la session
                  </button>
                )}
                {session.status === "active" && (
                  <button
                    onClick={handlePauseSession}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
                  >
                    Pause
                  </button>
                )}
                {session.status === "paused" && (
                  <button
                    onClick={handleStartSession}
                    className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-green-600"
                  >
                    Reprendre
                  </button>
                )}
                <button
                  onClick={handleEnd}
                  className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-all hover:opacity-90"
                >
                  Terminer
                </button>
              </>
            ) : (
              <button
                onClick={handleLeave}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
              >
                Quitter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 grid gap-4 lg:grid-cols-[1fr_350px] overflow-hidden">
        {/* Left column - Main content */}
        <div className="flex flex-col gap-4 overflow-auto p-4">
          {/* Metronome */}
          <JamMetronome
            metronome={metronome}
            isHost={isHost}
            onSync={syncMetronome}
          />

          {/* Song queue if setlist */}
          {session.setlist && (
            <JamSongQueue
              setlist={session.setlist}
              currentIndex={session.current_song_index}
              isHost={isHost}
              onSongSelect={(index, item) => {
                changeSong(
                  index,
                  item.song_id || null,
                  item.song_title || null,
                  item.song_artist || null
                );
              }}
            />
          )}
        </div>

        {/* Right column - Sidebar */}
        <div className="flex flex-col gap-4 border-l border-border p-4 overflow-hidden">
          {/* Participants */}
          <JamParticipants participants={participants} hostId={session.host_id} />

          {/* Chat */}
          <JamChat
            messages={messages}
            currentUserId={currentUser.id}
            onSendMessage={sendMessage}
          />
        </div>
      </div>
    </div>
  );
}
