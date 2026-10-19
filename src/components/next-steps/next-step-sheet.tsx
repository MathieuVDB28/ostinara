"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useIntlLocale } from "@/i18n/intl-locale";
import { Check, ChevronRight, ListMusic, Play, Trophy, Users, Video, X, type LucideIcon } from "lucide-react";
import { Cover } from "@/components/ui/cover";
import { addSongsToLibrary } from "@/lib/actions/songs";
import { addSongToSetlist, getSetlists } from "@/lib/actions/setlists";
import { getAlbumTracks } from "@/lib/actions/albums";
import { createChallenge } from "@/lib/actions/challenges";
import { addGearToSong, getGearItems, getSongGear, removeGearFromSong } from "@/lib/actions/gear";
import type { GearItem, SetlistWithDetails, Song, CatalogAlbumTrack } from "@/types";
import type { NextStep, RehearsalTarget } from "./types";

const AddCoverModal = dynamic(() =>
  import("@/components/covers/add-cover-modal").then((m) => m.AddCoverModal)
);

interface NextStepSheetProps {
  step: NextStep;
  onDone: () => void;
}

/**
 * La feuille « et maintenant ? ».
 *
 * En bas de l'ecran sur mobile, a portee du pouce ; centree sur desktop.
 * Elle propose, elle n'impose rien : « Plus tard » est toujours la.
 */
export function NextStepSheet({ step, onDone }: NextStepSheetProps) {
  const t = useTranslations("nextSteps");
  const tc = useTranslations("common");
  // La modale de cover remplace la feuille le temps de l'upload.
  const [coverFor, setCoverFor] = useState<Song | null>(null);

  // La feuille vit dans le layout, au-dessus des pages : suivre un de ses
  // liens (« Voir la répète », « Voir ma biblio ») la laisserait ouverte
  // sur la page d'arrivee. Changer de page clot le moment.
  const pathname = usePathname();
  const openedOn = useRef(pathname);
  useEffect(() => {
    if (pathname !== openedOn.current) onDone();
  }, [pathname, onDone]);

  useEffect(() => {
    if (coverFor) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDone();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [coverFor, onDone]);

  if (coverFor) {
    return (
      // La modale appelle onSuccess puis onClose : seul onClose ferme le
      // moment, sinon le suivant de la file serait saute.
      <AddCoverModal song={coverFor} isOpen onClose={onDone} onSuccess={() => {}} />
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onDone} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="next-step-title"
        className="relative z-10 max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-md sm:rounded-2xl sm:pb-5"
      >
        <button
          type="button"
          aria-label={tc("close")}
          onClick={onDone}
          className="absolute right-3 top-3 rounded-lg p-2 text-muted-foreground hover:bg-accent"
        >
          <X className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
        </button>

        {step.kind === "song_mastered" && (
          <SongMastered song={step.song} onCover={() => setCoverFor(step.song)} onDone={onDone} />
        )}
        {step.kind === "cover_posted" && <CoverPosted song={step.song} rehearsals={step.rehearsals} />}
        {step.kind === "song_added" && <SongAdded song={step.song} from={step.from} onDone={onDone} />}
        {step.kind === "album_tracks" && (
          <AlbumTracks
            album={step.album}
            initialTracks={step.tracks}
            preselected={step.preselected}
            onDone={onDone}
          />
        )}

        <button
          type="button"
          onClick={onDone}
          className="mt-4 min-h-[44px] w-full rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          {t("later")}
        </button>
      </div>
    </div>
  );
}

// === En-tete commun ===

function Heading({ eyebrow, title, subtitle, coverUrl }: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  coverUrl?: string | null;
}) {
  return (
    <div className="mb-5 flex items-center gap-3 pr-8">
      <Cover src={coverUrl} className="h-16 w-16 rounded-md" />
      <div className="min-w-0">
        <p className="font-display text-[11px] font-bold uppercase tracking-[0.08em] text-primary">{eyebrow}</p>
        <h2 id="next-step-title" className="truncate font-display text-3xl font-extrabold uppercase leading-none">
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

function ActionRow({ icon: Icon, label, hint, onClick, disabled, primary }: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-[60px] w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors disabled:opacity-50 ${
        primary ? "border-primary bg-primary text-primary-foreground hover:opacity-90" : "border-border hover:bg-accent"
      }`}
    >
      <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{label}</span>
        {hint && (
          <span className={`block text-xs ${primary ? "opacity-85" : "text-muted-foreground"}`}>{hint}</span>
        )}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 opacity-60" strokeWidth={2} aria-hidden="true" />
    </button>
  );
}

// === Morceau maitrise : cover, setlist ===

function SongMastered({ song, onCover, onDone }: { song: Song; onCover: () => void; onDone: () => void }) {
  const t = useTranslations("nextSteps.mastered");
  const [picking, setPicking] = useState(false);
  const hasCover = (song.covers_count ?? 0) > 0;

  return (
    <>
      <Heading eyebrow={t("eyebrow")} title={song.title} subtitle={song.artist} coverUrl={song.cover_url} />
      <p className="mb-4 font-serif text-[15px] italic leading-relaxed">
        {t("lead")}
      </p>

      <div className="space-y-2">
        <ActionRow
          icon={Video}
          primary
          label={hasCover ? t("newCover") : t("cover")}
          hint={t("coverHint")}
          onClick={onCover}
        />
        {picking ? (
          <SetlistPicker songId={song.id} onDone={onDone} />
        ) : (
          <ActionRow
            icon={ListMusic}
            label={t("setlist")}
            hint={t("setlistHint")}
            onClick={() => setPicking(true)}
          />
        )}
      </div>

      <GearPicker songId={song.id} />
    </>
  );
}

/**
 * « Joué avec » : le matos du morceau, repris par chaque cover postee.
 *
 * Seuls les instruments, amplis et effets sont proposes — un mediator ou
 * un pupitre ne racontent rien d'une prise. Sans matos dans le profil, le
 * bloc ne s'affiche pas.
 */
const PLAYABLE_GEAR = new Set(["guitar", "bass", "amp", "effect"]);

function GearPicker({ songId }: { songId: string }) {
  const t = useTranslations("nextSteps.gear");
  const [gear, setGear] = useState<GearItem[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getGearItems(), getSongGear(songId)]).then(([items, linked]) => {
      if (cancelled) return;
      setGear(items.filter((item) => item.is_active && PLAYABLE_GEAR.has(item.type)));
      setSelected(new Set(linked.map((item) => item.id)));
    });
    return () => {
      cancelled = true;
    };
  }, [songId]);

  if (!gear || gear.length === 0) return null;

  const toggle = async (gearId: string) => {
    const on = selected.has(gearId);
    setBusy(gearId);
    const result = on ? await removeGearFromSong(songId, gearId) : await addGearToSong(songId, gearId);
    if (result.success) {
      setSelected((previous) => {
        const next = new Set(previous);
        if (on) next.delete(gearId);
        else next.add(gearId);
        return next;
      });
    }
    setBusy(null);
  };

  return (
    <div className="mt-5 border-t border-border pt-4">
      <p className="mb-2 text-xs font-semibold text-muted-foreground">{t("playedWith")}</p>
      <div className="flex flex-wrap gap-2">
        {gear.map((item) => {
          const on = selected.has(item.id);
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={on}
              disabled={busy === item.id}
              onClick={() => toggle(item.id)}
              className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors disabled:opacity-50 ${
                on ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent"
              }`}
            >
              {on && <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />}
              {item.brand} {item.model}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{t("hint")}</p>
    </div>
  );
}

// === Cover postee : la repete ===

function CoverPosted({ song, rehearsals }: { song: Song; rehearsals: RehearsalTarget[] }) {
  const t = useTranslations("nextSteps");
  const intlLocale = useIntlLocale();
  const [done, setDone] = useState<Record<string, "added" | "already">>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleAdd = (target: RehearsalTarget) => {
    setError(null);
    startTransition(async () => {
      const result = await addSongToSetlist(target.setlistId, song.id);
      if (result.success) {
        setDone((previous) => ({ ...previous, [target.setlistId]: result.alreadyThere ? "already" : "added" }));
      } else {
        setError(result.error || t("addFailed"));
      }
    });
  };

  return (
    <>
      <Heading eyebrow={t("cover.eyebrow")} title={song.title} subtitle={song.artist} coverUrl={song.cover_url} />
      <p className="mb-4 font-serif text-[15px] italic leading-relaxed">
        {t("cover.lead")}
      </p>

      <div className="space-y-2">
        {rehearsals.map((target) => {
          const state = done[target.setlistId];
          const when = new Date(target.date).toLocaleDateString(intlLocale, {
            weekday: "long",
            day: "numeric",
            month: "long",
          });
          return state ? (
            <p
              key={target.setlistId}
              role="status"
              className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-border px-3.5 py-3 text-sm"
            >
              <Check className="h-4 w-4 text-success" strokeWidth={2.25} aria-hidden="true" />
              {state === "added" ? t("cover.added", { name: target.setlistName }) : t("cover.already", { name: target.setlistName })}
              <Link
                href={`/setlists/rehearsals/${target.rehearsalId}`}
                className="font-semibold underline-offset-2 hover:underline"
              >
                {t("cover.seeRehearsal")}
              </Link>
            </p>
          ) : (
            <ActionRow
              key={target.setlistId}
              icon={Users}
              label={t("cover.addTo", { name: target.setlistName })}
              hint={`${target.bandName} · ${when}`}
              onClick={() => handleAdd(target)}
              disabled={pending}
            />
          );
        })}
        {error && <p role="status" className="text-xs text-destructive">{error}</p>}
      </div>
    </>
  );
}

function SetlistPicker({ songId, onDone }: { songId: string; onDone: () => void }) {
  const t = useTranslations("nextSteps");
  const [setlists, setSetlists] = useState<SetlistWithDetails[] | null>(null);
  const [added, setAdded] = useState<{ name: string; already: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    getSetlists().then(setSetlists);
  }, []);

  const handlePick = (setlist: SetlistWithDetails) => {
    setError(null);
    startTransition(async () => {
      const result = await addSongToSetlist(setlist.id, songId);
      if (result.success) setAdded({ name: setlist.name, already: !!result.alreadyThere });
      else setError(result.error || t("addFailed"));
    });
  };

  if (added) {
    return (
      <p role="status" className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-border px-3.5 py-3 text-sm">
        <Check className="h-4 w-4 text-success" strokeWidth={2.25} aria-hidden="true" />
        <span>
          {added.already ? t("cover.already", { name: added.name }) : t("cover.added", { name: added.name })}
        </span>
        <Link href="/setlists" onClick={onDone} className="font-semibold underline-offset-2 hover:underline">
          {t("setlists.see")}
        </Link>
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-border p-2">
      <p className="px-1.5 pb-1.5 pt-1 text-xs font-semibold text-muted-foreground">{t("setlists.which")}</p>
      {setlists === null ? (
        <p className="px-1.5 py-3 text-sm text-muted-foreground">{t("setlists.loading")}</p>
      ) : setlists.length === 0 ? (
        <p className="px-1.5 py-2 text-sm">
          {t("setlists.none")}{" "}
          <Link href="/setlists" onClick={onDone} className="font-semibold text-primary underline-offset-2 hover:underline">
            {t("setlists.create")}
          </Link>
        </p>
      ) : (
        <ul className="max-h-56 overflow-y-auto">
          {setlists.map((setlist) => (
            <li key={setlist.id}>
              <button
                type="button"
                disabled={pending}
                onClick={() => handlePick(setlist)}
                className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-1.5 py-2 text-left hover:bg-accent disabled:opacity-50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{setlist.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {setlist.band?.name ?? t("setlists.personal")} · {t("setlists.songs", { count: setlist.song_count })}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p role="status" className="px-1.5 pt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

// === Morceau repris d'ailleurs : jouer, defier ===

function SongAdded({ song, from, onDone }: {
  song: Song;
  from?: { id: string; name: string };
  onDone: () => void;
}) {
  const t = useTranslations("nextSteps.added");
  const router = useRouter();
  const [challenge, setChallenge] = useState<"idle" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handlePlay = () => {
    onDone();
    router.push(`/jouer?song=${song.id}`);
  };

  const handleChallenge = () => {
    if (!from) return;
    setError(null);
    startTransition(async () => {
      const result = await createChallenge({
        challenger_id: from.id,
        challenge_type: "song_mastery",
        duration_days: 14,
        song_id: song.id,
      });
      if (result.success) setChallenge("sent");
      else setError(result.error || t("challengeFailed"));
    });
  };

  return (
    <>
      <Heading eyebrow={t("eyebrow")} title={song.title} subtitle={song.artist} coverUrl={song.cover_url} />

      <div className="space-y-2">
        <ActionRow
          icon={Play}
          primary
          label={t("work")}
          hint={t("workHint")}
          onClick={handlePlay}
        />
        {from &&
          (challenge === "sent" ? (
            <p role="status" className="flex items-center gap-2 rounded-xl border border-border px-3.5 py-3 text-sm">
              <Check className="h-4 w-4 text-success" strokeWidth={2.25} aria-hidden="true" />
              {t("challengeSent", { name: from.name })}
            </p>
          ) : (
            <ActionRow
              icon={Trophy}
              label={t("challenge", { name: from.name })}
              hint={t("challengeHint")}
              onClick={handleChallenge}
              disabled={pending}
            />
          ))}
        {error && <p role="status" className="text-xs text-destructive">{error}</p>}
      </div>
    </>
  );
}

// === Album ecoute : titres a apprendre ===

function AlbumTracks({ album, initialTracks, preselected, onDone }: {
  album: { name: string; artist: string; coverUrl?: string; deezerId: string };
  initialTracks?: CatalogAlbumTrack[];
  preselected?: string[];
  onDone: () => void;
}) {
  const t = useTranslations("nextSteps.album");
  const [tracks, setTracks] = useState<CatalogAlbumTrack[] | null>(initialTracks ?? null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(preselected));
  const [result, setResult] = useState<{ added: number; alreadyThere: number; error?: string } | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (initialTracks) return;
    let cancelled = false;
    getAlbumTracks(album.deezerId).then((items) => {
      if (!cancelled) setTracks(items);
    });
    return () => {
      cancelled = true;
    };
  }, [album.deezerId, initialTracks]);

  const toggle = useCallback((id: string) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleAdd = () => {
    if (!tracks) return;
    const picked = tracks.filter((track) => selected.has(track.id));
    startTransition(async () => {
      const outcome = await addSongsToLibrary(
        picked.map((track) => ({
          title: track.name,
          artist: album.artist,
          album: album.name,
          cover_url: album.coverUrl,
          deezer_id: track.id,
        })),
        { from: "album", label: album.name }
      );
      setResult(outcome);
    });
  };

  const count = selected.size;

  return (
    <>
      <Heading eyebrow={t("eyebrow")} title={album.name} subtitle={album.artist} coverUrl={album.coverUrl} />

      {result && !result.error ? (
        <div role="status" className="rounded-xl border border-border px-3.5 py-3 text-sm">
          <p className="flex items-center gap-2 font-semibold">
            <Check className="h-4 w-4 text-success" strokeWidth={2.25} aria-hidden="true" />
            {result.added > 0 ? t("added", { count: result.added }) : t("allThere")}
          </p>
          {result.added > 0 && result.alreadyThere > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("alreadyThere", { count: result.alreadyThere })}
            </p>
          )}
          <Link href="/biblio" onClick={onDone} className="mt-2 inline-block font-semibold underline-offset-2 hover:underline">
            {t("seeLibrary")}
          </Link>
        </div>
      ) : (
        <>
          <p className="mb-3 font-serif text-[15px] italic leading-relaxed">
            {t("lead")}
          </p>

          {tracks === null ? (
            <p className="py-3 text-sm text-muted-foreground">{t("loading")}</p>
          ) : tracks.length === 0 ? (
            <p className="py-3 text-sm text-muted-foreground">{t("unavailable")}</p>
          ) : (
            <ol aria-label={t("tracks")} className="max-h-72 divide-y divide-border overflow-y-auto border-y border-border">
              {tracks.map((track) => {
                const checked = selected.has(track.id);
                return (
                  <li key={track.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      onClick={() => toggle(track.id)}
                      className="grid min-h-[44px] w-full grid-cols-[24px_minmax(0,1fr)_20px] items-center gap-2 py-2 text-left hover:bg-accent/50"
                    >
                      <span className="tabular text-right font-mono text-xs text-muted-foreground">{track.track_number}</span>
                      <span className={`truncate text-sm ${checked ? "font-semibold" : ""}`}>{track.name}</span>
                      <span
                        aria-hidden="true"
                        className={`flex h-5 w-5 items-center justify-center rounded border ${
                          checked ? "border-primary bg-primary text-primary-foreground" : "border-input"
                        }`}
                      >
                        {checked && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}

          {result?.error && (
            <p role="status" className="mt-3 text-xs text-destructive">
              {result.added > 0 && t("partial", { count: result.added })}
              {result.error}
            </p>
          )}

          <button
            type="button"
            onClick={handleAdd}
            disabled={count === 0 || pending}
            className="mt-4 min-h-[48px] w-full rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? t("adding") : count === 0 ? t("pick") : t("add", { count })}
          </button>
        </>
      )}
    </>
  );
}
