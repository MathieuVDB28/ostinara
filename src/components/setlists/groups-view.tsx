"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SetlistCard } from "./setlist-card";
import { CreateSetlistModal } from "./create-setlist-modal";
import { CreateBandModal } from "./create-band-modal";
import { BandInvitationCard } from "./band-invitation-card";
import { EmptyState } from "@/components/ui/empty-state";
import type {
  SetlistWithDetails,
  BandWithMembers,
  BandInvitationWithDetails,
  RehearsalWithDetails,
  UserPlan,
} from "@/types";

interface GroupsViewProps {
  setlists: SetlistWithDetails[];
  bands: BandWithMembers[];
  invitations: BandInvitationWithDetails[];
  upcomingRehearsals: RehearsalWithDetails[];
  userPlan: UserPlan;
}

function formatRehearsalDate(date: string): string {
  return new Date(date).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/**
 * Index des groupes : on choisit un groupe, puis on entre dedans.
 *
 * Setlists + groupes + repets + tech rider + jam etaient trois onglets a
 * plat par-dessus la barre du bas. Le monde "groupe" est trop grand pour
 * un segment : il devient une pile — liste, puis detail.
 */
export function GroupsView({
  setlists,
  bands,
  invitations,
  upcomingRehearsals,
  userPlan,
}: GroupsViewProps) {
  const router = useRouter();
  const [showCreateSetlist, setShowCreateSetlist] = useState(false);
  const [showCreateBand, setShowCreateBand] = useState(false);

  const handleRefresh = () => router.refresh();

  const hasBandPlan = userPlan === "band";
  const personalSetlists = setlists.filter((s) => s.is_personal);

  const nextRehearsalByBand = new Map<string, RehearsalWithDetails>();
  for (const rehearsal of upcomingRehearsals) {
    if (!nextRehearsalByBand.has(rehearsal.band.id)) {
      nextRehearsalByBand.set(rehearsal.band.id, rehearsal);
    }
  }

  return (
    <div className="space-y-8">
      {/* Invitations : une action en attente passe avant le reste */}
      {invitations.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Invitations en attente
          </h2>
          {invitations.map((invitation) => (
            <BandInvitationCard
              key={invitation.id}
              invitation={invitation}
              onAction={handleRefresh}
            />
          ))}
        </section>
      )}

      {/* Groupes */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">
            Mes groupes
            {bands.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {bands.length}
              </span>
            )}
          </h2>
          {hasBandPlan && (
            <button
              onClick={() => setShowCreateBand(true)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Groupe
            </button>
          )}
        </div>

        {bands.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {bands.map((band) => {
              const nextRehearsal = nextRehearsalByBand.get(band.id);
              const bandSetlists = setlists.filter((s) => s.band_id === band.id);

              return (
                <Link
                  key={band.id}
                  href={`/commu/groupes/${band.id}`}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
                >
                  {band.cover_url ? (
                    <Image
                      src={band.cover_url}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-xl object-cover"
                      width={56}
                      height={56}
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <span className="material-symbols-outlined text-primary">
                        groups
                      </span>
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-bold">{band.name}</h3>
                    <p className="truncate text-sm text-muted-foreground">
                      {band.members.length} membre
                      {band.members.length > 1 ? "s" : ""}
                      {bandSetlists.length > 0 &&
                        ` • ${bandSetlists.length} setlist${bandSetlists.length > 1 ? "s" : ""}`}
                    </p>
                    {nextRehearsal && (
                      <p className="mt-1 truncate text-xs font-medium text-primary">
                        Répét. {formatRehearsalDate(nextRehearsal.date)}
                      </p>
                    )}
                  </div>

                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined shrink-0 text-muted-foreground"
                  >
                    chevron_right
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState
            compact
            icon="groups"
            title="Aucun groupe"
            description={
              hasBandPlan
                ? "Un groupe met en commun les setlists, le calendrier des répètes et la fiche technique. Chaque membre voit les mêmes, et les modifie."
                : "Un groupe met en commun setlists, répètes et fiche technique. Les espaces groupe font partie du plan Band."
            }
            actions={
              hasBandPlan
                ? [
                    {
                      label: "Créer un groupe",
                      icon: "add",
                      primary: true,
                      onClick: () => setShowCreateBand(true),
                    },
                  ]
                : [
                    { label: "Voir le plan Band", primary: true, href: "/pricing" },
                    { label: "Créer une setlist", icon: "add", onClick: () => setShowCreateSetlist(true) },
                  ]
            }
            hint={
              hasBandPlan
                ? "Tu invites les membres par leur pseudo une fois le groupe créé."
                : "Sans le plan Band, tes setlists perso restent disponibles juste en dessous."
            }
          />
        )}
      </section>

      {/* Setlists perso : elles n'appartiennent a aucun groupe */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">
            Mes setlists
            {personalSetlists.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {personalSetlists.length}
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

        {personalSetlists.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {personalSetlists.map((setlist) => (
              <SetlistCard
                key={setlist.id}
                setlist={setlist}
                onClick={() => router.push(`/setlists/${setlist.id}`)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            compact
            icon="queue_music"
            title="Aucune setlist perso"
            description="Une setlist ordonne des morceaux de ta bibliothèque pour un set : tu la joues dans l'ordre, seul ou avant une répète."
            actions={[
              {
                label: "Créer une setlist",
                icon: "add",
                primary: true,
                onClick: () => setShowCreateSetlist(true),
              },
              { label: "Voir ma bibliothèque", icon: "music_note", href: "/biblio" },
            ]}
            hint="Les morceaux viennent de ta bibliothèque : ajoute-les là-bas d'abord."
          />
        )}
      </section>

      <CreateSetlistModal
        isOpen={showCreateSetlist}
        onClose={() => setShowCreateSetlist(false)}
        onSuccess={handleRefresh}
        bands={bands}
      />

      <CreateBandModal
        isOpen={showCreateBand}
        onClose={() => setShowCreateBand(false)}
        onSuccess={handleRefresh}
      />
    </div>
  );
}
