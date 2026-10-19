"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { INTL_LOCALE, isLocale } from "@/i18n/config";
import { MAX_SYNC_ATTEMPTS, readQueue, readSnapshot } from "@/lib/offline/db";
import { songTempoProgress } from "@/lib/song-progress";
import type { OfflineSnapshot, QueuedPracticeSession } from "@/types";
import { Icon } from "@/components/ui/icon";

/**
 * Ce qu'on peut faire sans reseau.
 *
 * Une salle de repet' au sous-sol, c'est zero barre. Cette page est ce
 * que l'app installee affiche a ce moment-la, a la place de l'erreur du
 * navigateur : la bibliotheque, le journal, et le compte des sessions
 * qui attendent d'etre envoyees.
 *
 * Tout vient d'IndexedDB. Aucune requete n'est tentee : ce serait un
 * spinner de plus devant quelqu'un qui sait deja qu'il n'a pas de reseau.
 */

type OfflineTab = "library" | "journal";

function formatMinutes(minutes: number, tc: (key: "duration.minutes" | "duration.hours" | "duration.hoursMinutes", values: Record<string, number>) => string): string {
  if (minutes < 60) return tc("duration.minutes", { m: minutes });
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? tc("duration.hoursMinutes", { h: hours, m: rest }) : tc("duration.hours", { h: hours });
}

function formatDay(iso: string, intlLocale: string): string {
  return new Date(iso).toLocaleDateString(intlLocale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function OfflineView() {
  const t = useTranslations("offline.view");
  const tc = useTranslations("common");
  // La page est pre-rendue : la langue vient du fournisseur client (OfflineIntl).
  const locale = useLocale();
  const intlLocale = INTL_LOCALE[isLocale(locale) ? locale : "fr"];
  const [snapshot, setSnapshot] = useState<OfflineSnapshot | null>(null);
  const [queue, setQueue] = useState<QueuedPracticeSession[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<OfflineTab>("library");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [stored, pending] = await Promise.all([readSnapshot(), readQueue()]);
      if (cancelled) return;
      setSnapshot(stored);
      setQueue(pending);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const bestBpm = useMemo(() => {
    const map = new Map<string, number>();
    for (const session of snapshot?.sessions ?? []) {
      if (!session.song_id || session.bpm_achieved === null) continue;
      map.set(
        session.song_id,
        Math.max(map.get(session.song_id) ?? 0, session.bpm_achieved)
      );
    }
    return map;
  }, [snapshot]);

  const learning = (snapshot?.songs ?? []).filter(
    (song) => song.status === "learning"
  );
  const others = (snapshot?.songs ?? []).filter(
    (song) => song.status !== "learning"
  );

  const pending = queue.filter((entry) => entry.attempts < MAX_SYNC_ATTEMPTS);

  return (
    <main className="mx-auto max-w-2xl p-4 pb-16">
      <header className="mb-6">
        <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Icon name="cloud_off" className="h-[20px] w-[20px]" />
          {t("offline")}
        </p>
        <h1 className="mt-1 font-display text-5xl font-extrabold uppercase leading-none">Ostinara</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {snapshot
            ? t("copyOf", {
                date: new Date(snapshot.generatedAt).toLocaleString(intlLocale, {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              })
            : t("noCopy")}
        </p>
      </header>

      {queue.length > 0 && (
        <p className="mb-5 flex items-center gap-2 border-y border-border py-2.5 text-sm">
          <Icon name="cloud_upload" className="h-[18px] w-[18px] text-muted-foreground" />
          <span className="tabular">
            {t("pending", { count: pending.length })}
          </span>
        </p>
      )}

      {!loaded ? (
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      ) : !snapshot ? (
        <div className="p-6 text-center">
          <p className="font-semibold">{t("nothing")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("nothingHint")}
          </p>
        </div>
      ) : (
        <>
          {/* Le resume : ce que le journal dit, meme sans serveur. */}
          <dl className="mb-6 grid grid-cols-3 gap-3 border-y border-border py-3">
            <div className="flex flex-col-reverse gap-1">
              <dt className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{t("streak")}</dt>
              <dd className="tabular font-display text-[28px] font-bold leading-none">
                {tc("duration.days", { d: snapshot.stats.currentStreak })}
              </dd>
            </div>
            <div className="flex flex-col-reverse gap-1">
              <dt className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{t("thisWeek")}</dt>
              <dd className="tabular font-display text-[28px] font-bold leading-none">
                {formatMinutes(snapshot.stats.minutesThisWeek, tc)}
              </dd>
            </div>
            <div className="flex flex-col-reverse gap-1">
              <dt className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{t("songs")}</dt>
              <dd className="tabular font-display text-[28px] font-bold leading-none">
                {snapshot.songs.length}
              </dd>
            </div>
          </dl>

          <div className="mb-4 flex gap-1 rounded-xl bg-accent/50 p-1">
            {(
              [
                { value: "library", label: t("library") },
                { value: "journal", label: t("journal") },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTab(option.value)}
                aria-current={tab === option.value ? "page" : undefined}
                className={`flex min-h-[40px] flex-1 items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  tab === option.value
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {tab === "library" ? (
            <div className="space-y-5">
              <OfflineSongList
                title={t("learning")}
                songs={learning}
                bestBpm={bestBpm}
              />
              <OfflineSongList
                title={t("rest")}
                songs={others}
                bestBpm={bestBpm}
              />
            </div>
          ) : (
            <ul className="space-y-2">
              {snapshot.sessions.slice(0, 50).map((session) => (
                <li
                  key={session.id}
                  className="flex items-baseline justify-between gap-3 border-b border-border py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {session.song?.title ?? t("freeSession")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDay(session.practiced_at, intlLocale)}
                    </p>
                  </div>
                  <p className="tabular shrink-0 text-sm text-muted-foreground">
                    {formatMinutes(session.duration_minutes, tc)}
                    {session.bpm_achieved ? (
                      <span className="ml-2 font-semibold text-primary">
                        {session.bpm_achieved} BPM
                      </span>
                    ) : null}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-8 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-input px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Icon name="refresh" className="h-[20px] w-[20px]" />
        {t("retry")}
      </button>
    </main>
  );
}

interface OfflineSongListProps {
  title: string;
  songs: OfflineSnapshot["songs"];
  bestBpm: Map<string, number>;
}

function OfflineSongList({ title, songs, bestBpm }: OfflineSongListProps) {
  if (songs.length === 0) return null;

  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
        <span className="tabular ml-2 font-normal">{songs.length}</span>
      </h2>
      <ul className="space-y-2">
        {songs.map((song) => {
          const tempo = songTempoProgress(song, bestBpm.get(song.id) ?? null);
          return (
            <li
              key={song.id}
              className="flex items-center gap-3 border-b border-border py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{song.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {song.artist}
                  {song.tuning ? ` · ${song.tuning}` : ""}
                  {song.capo_position > 0 ? ` · Capo ${song.capo_position}` : ""}
                </p>
              </div>
              {tempo && (
                <span className="tabular shrink-0 text-xs font-semibold text-primary">
                  {tempo.achieved}
                  <span className="text-muted-foreground">/{tempo.target}</span>
                  <span className="sr-only"> BPM</span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
