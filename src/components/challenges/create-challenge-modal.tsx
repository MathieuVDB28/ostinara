"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Friend, Song, ChallengeType } from "@/types";
import { createChallenge } from "@/lib/actions/challenges";

interface CreateChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  friends: Friend[];
  songs: Song[];
}

const CHALLENGE_TYPES: { value: ChallengeType; icon: React.ReactNode }[] = [
  {
    value: "practice_time",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    value: "streak",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
      </svg>
    ),
  },
  {
    value: "song_mastery",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

const DURATION_PRESETS = [1, 3, 7, 14, 30] as const;

export function CreateChallengeModal({
  isOpen,
  onClose,
  friends,
  songs,
}: CreateChallengeModalProps) {
  const t = useTranslations("challenges");
  const tc = useTranslations("common");
  const router = useRouter();
  const [selectedFriend, setSelectedFriend] = useState<string>("");
  const [challengeType, setChallengeType] = useState<ChallengeType>("practice_time");
  const [duration, setDuration] = useState<number>(7);
  const [selectedSong, setSelectedSong] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedFriend("");
      setChallengeType("practice_time");
      setDuration(7);
      setSelectedSong("");
      setError(null);
    }
  }, [isOpen]);

  // Filter songs to only show non-mastered ones for song_mastery
  const availableSongs = songs.filter((s) => s.status !== "mastered");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedFriend) {
      setError(t("create.selectFriend"));
      return;
    }

    if (challengeType === "song_mastery" && !selectedSong) {
      setError(t("create.selectSong"));
      return;
    }

    setIsLoading(true);

    const result = await createChallenge({
      challenger_id: selectedFriend,
      challenge_type: challengeType,
      duration_days: duration,
      song_id: challengeType === "song_mastery" ? selectedSong : undefined,
    });

    if (!result.success) {
      setError(result.error || tc("genericError"));
      setIsLoading(false);
      return;
    }

    router.refresh();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-auto rounded-xl border border-border bg-card p-6">
        <button aria-label={tc("close")}
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="mb-6 font-display text-3xl font-extrabold uppercase leading-none">{t("create.title")}</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sélection de l'ami */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              {t("create.friend")}
            </label>
            <select
              value={selectedFriend}
              onChange={(e) => setSelectedFriend(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">{t("create.chooseFriend")}</option>
              {friends.map((friend) => (
                <option key={friend.id} value={friend.profile.id}>
                  {friend.profile.display_name || friend.profile.username}
                </option>
              ))}
            </select>
          </div>

          {/* Type de challenge */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              {t("create.type")}
            </label>
            <div className="space-y-2">
              {CHALLENGE_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setChallengeType(type.value)}
                  className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                    challengeType === type.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      challengeType === type.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {type.icon}
                  </span>
                  <div>
                    <p className="font-medium">{t(`typeLong.${type.value}`)}</p>
                    <p className="text-xs text-muted-foreground">
                      {t(`typeDescription.${type.value}`)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Sélection du morceau (si song_mastery) */}
          {challengeType === "song_mastery" && (
            <div>
              <label className="mb-2 block text-sm font-medium">
                {t("create.songToMaster")}
              </label>
              {availableSongs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("create.noSong")}
                </p>
              ) : (
                <select
                  value={selectedSong}
                  onChange={(e) => setSelectedSong(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">{t("create.chooseSong")}</option>
                  {availableSongs.map((song) => (
                    <option key={song.id} value={song.id}>
                      {song.title} - {song.artist}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Durée */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              {t("create.durationLabel")}
            </label>
            <div className="flex flex-wrap gap-2">
              {DURATION_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDuration(preset)}
                  className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                    duration === preset
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {t(`create.duration.${preset}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Erreur */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || !selectedFriend || (challengeType === "song_mastery" && !selectedSong)}
            className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {isLoading ? t("create.sending") : t("create.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
