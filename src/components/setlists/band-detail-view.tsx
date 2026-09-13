"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SetlistCard } from "./setlist-card";
import { CreateSetlistModal } from "./create-setlist-modal";
import { InviteMemberModal } from "./invite-member-modal";
import { StartJamModal } from "@/components/jam/start-jam-modal";
import { CreateRehearsalModal } from "@/components/rehearsals/create-rehearsal-modal";
import { RehearsalCard } from "@/components/rehearsals/rehearsal-card";
import { RehearsalCalendar } from "@/components/rehearsals/rehearsal-calendar";
import type {
  BandWithMembers,
  SetlistWithDetails,
  RehearsalWithDetails,
  JamSessionWithDetails,
} from "@/types";

interface BandDetailViewProps {
  band: BandWithMembers;
  setlists: SetlistWithDetails[];
  rehearsals: RehearsalWithDetails[];
  activeJam: JamSessionWithDetails | null;
  currentUserId: string;
}

/**
 * Le detail d'un groupe : tout ce que le groupe possede, sur une pile
 * plutot que derriere une quatrieme barre d'onglets.
 */
export function BandDetailView({
  band,
  setlists,
  rehearsals,
  activeJam,
  currentUserId,
}: BandDetailViewProps) {
  const router = useRouter();
  const [showInvite, setShowInvite] = useState(false);
  const [showCreateSetlist, setShowCreateSetlist] = useState(false);
  const [showCreateRehearsal, setShowCreateRehearsal] = useState(false);
  const [showJam, setShowJam] = useState(false);
  const [rehearsalView, setRehearsalView] = useState<"list" | "calendar">("list");

  const handleRefresh = () => router.refresh();
  const isOwner = band.owner_id === currentUserId;

  const upcomingRehearsals = rehearsals.filter(
    (rehearsal) =>
      rehearsal.status === "scheduled" && new Date(rehearsal.date) >= new Date()
  );

  return (
    <div className="space-y-8">
      {/* Retour + identite du groupe */}
      <div>
        <Link
          href="/commu/groupes"
          className="mb-4 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
            chevron_left
          </span>
          Groupes
        </Link>

        <div className="flex items-start gap-4">
          {band.cover_url ? (
            <Image
              src={band.cover_url}
              alt=""
              className="h-16 w-16 shrink-0 rounded-2xl object-cover"
              width={64}
              height={64}
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <span className="material-symbols-outlined text-2xl text-primary">
                groups
              </span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-extrabold">{band.name}</h1>
            {band.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {band.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Jam en cours : une session active est l'information la plus urgente */}
      {activeJam && (
        <Link
          href={`/jam/${activeJam.id}`}
          className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-4 transition-colors hover:bg-primary/15"
        >
          <span className="flex h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-primary" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-primary">Jam en cours</p>
            <p className="truncate text-sm text-muted-foreground">
              Rejoins la session du groupe
            </p>
          </div>
          <span aria-hidden="true" className="material-symbols-outlined text-primary">
            chevron_right
          </span>
        </Link>
      )}

      {/* Actions du groupe */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button
          onClick={() => setShowJam(true)}
          className="flex min-h-[44px] flex-col items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-3 text-sm font-medium transition-colors hover:bg-accent"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-primary">
            music_note
          </span>
          Lancer un jam
        </button>

        <button
          onClick={() => setShowCreateRehearsal(true)}
          className="flex min-h-[44px] flex-col items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-3 text-sm font-medium transition-colors hover:bg-accent"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-primary">
            event
          </span>
          Planifier une répète
        </button>

        <Link
          href={`/setlists/tech-rider/${band.id}`}
          className="flex min-h-[44px] flex-col items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-3 text-center text-sm font-medium transition-colors hover:bg-accent"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-primary">
            description
          </span>
          Fiche technique
        </Link>

        {isOwner && (
          <button
            onClick={() => setShowInvite(true)}
            className="flex min-h-[44px] flex-col items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-3 text-sm font-medium transition-colors hover:bg-accent"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-primary">
              person_add
            </span>
            Inviter
          </button>
        )}
      </div>

      {/* Setlists du groupe */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">
            Setlists
            {setlists.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {setlists.length}
              </span>
            )}
          </h2>
          <button
            onClick={() => setShowCreateSetlist(true)}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Setlist
          </button>
        </div>

        {setlists.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {setlists.map((setlist) => (
              <SetlistCard
                key={setlist.id}
                setlist={setlist}
                onClick={() => router.push(`/setlists/${setlist.id}`)}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Aucune setlist pour ce groupe.
          </p>
        )}
      </section>

      {/* Repetitions */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">
            Répètes à venir
            {upcomingRehearsals.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {upcomingRehearsals.length}
              </span>
            )}
          </h2>

          <div role="group" aria-label="Affichage des répètes" className="flex gap-1 rounded-lg bg-accent/60 p-1">
            {(["list", "calendar"] as const).map((view) => (
              <button
                key={view}
                onClick={() => setRehearsalView(view)}
                aria-pressed={rehearsalView === view}
                className={`flex min-h-[36px] items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  rehearsalView === view
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                  {view === "list" ? "list" : "calendar_month"}
                </span>
                {view === "list" ? "Liste" : "Calendrier"}
              </button>
            ))}
          </div>
        </div>

        {rehearsalView === "calendar" ? (
          <RehearsalCalendar
            rehearsals={rehearsals}
            currentUserId={currentUserId}
            onRehearsalClick={(rehearsal) =>
              router.push(`/setlists/rehearsals/${rehearsal.id}`)
            }
          />
        ) : upcomingRehearsals.length > 0 ? (
          <div className="space-y-3">
            {upcomingRehearsals.map((rehearsal) => (
              <RehearsalCard
                key={rehearsal.id}
                rehearsal={rehearsal}
                currentUserId={currentUserId}
                onClick={() => router.push(`/setlists/rehearsals/${rehearsal.id}`)}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Aucune répète planifiée.
          </p>
        )}
      </section>

      {/* Membres */}
      <section>
        <h2 className="mb-3 text-lg font-bold">
          Membres
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {band.members.length}
          </span>
        </h2>
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {band.members.map((member) => (
            <li key={member.id} className="flex items-center gap-3 px-4 py-3">
              {member.profile?.avatar_url ? (
                <Image
                  src={member.profile.avatar_url}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-full object-cover"
                  width={36}
                  height={36}
                />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {(member.profile?.display_name ||
                    member.profile?.username ||
                    "?")[0]?.toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {member.profile?.display_name || member.profile?.username}
                </p>
                <p className="truncate text-xs capitalize text-muted-foreground">
                  {member.role}
                </p>
              </div>
              {member.user_id === band.owner_id && (
                <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  Admin
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <CreateSetlistModal
        isOpen={showCreateSetlist}
        onClose={() => setShowCreateSetlist(false)}
        onSuccess={handleRefresh}
        bands={[band]}
      />

      <InviteMemberModal
        isOpen={showInvite}
        onClose={() => setShowInvite(false)}
        onSuccess={handleRefresh}
        bandId={band.id}
        bandName={band.name}
      />

      <CreateRehearsalModal
        isOpen={showCreateRehearsal}
        onClose={() => setShowCreateRehearsal(false)}
        onSuccess={handleRefresh}
        band={band}
        setlists={setlists}
      />

      <StartJamModal
        isOpen={showJam}
        onClose={() => setShowJam(false)}
        band={band}
      />
    </div>
  );
}
