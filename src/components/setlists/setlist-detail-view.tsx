"use client";

import { Icon } from "@/components/ui/icon";
import dynamic from "next/dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SetlistItemCard } from "./setlist-item-card";
import { AddItemModal } from "./add-item-modal";
import { EditItemModal } from "./edit-item-modal";
// Charge a la demande : @react-pdf/renderer pese ~988 Ko et ne sert
// qu'au clic sur « Export PDF ».
const SetlistPDFExport = dynamic(
  () => import("./setlist-pdf-export").then((m) => m.SetlistPDFExport),
  {
    ssr: false,
    loading: () => (
      <div className="h-10 w-32 animate-pulse rounded-xl bg-muted" />
    ),
  }
);
import {
  updateSetlist,
  deleteSetlist,
  deleteSetlistItem,
  reorderSetlistItems,
  duplicateSetlist,
} from "@/lib/actions/setlists";
import { createJamSession } from "@/lib/actions/jam-sessions";
import type {
  SetlistWithDetails,
  SetlistItemWithSongOwner,
  Profile,
  Song,
  UserPlan,
} from "@/types";

interface SetlistDetailViewProps {
  setlist: SetlistWithDetails;
  songSources: { member: Profile | null; songs: Song[] }[];
  userPlan: UserPlan;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}min`;
  }
  if (minutes > 0) {
    return `${minutes}min ${secs.toString().padStart(2, "0")}s`;
  }
  return `${secs}s`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const ACTION =
  "inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-border px-3.5 text-[13px] font-semibold transition-colors hover:bg-accent";

function SetStat({ label, value, small = false }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col-reverse gap-1">
      <dt className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{label}</dt>
      <dd className={`tabular truncate font-display font-bold leading-none ${small ? "text-lg" : "text-[30px]"}`}>{value}</dd>
    </div>
  );
}

export function SetlistDetailView({
  setlist: initialSetlist,
  songSources,
  userPlan,
}: SetlistDetailViewProps) {
  const router = useRouter();
  const [setlist, setSetlist] = useState(initialSetlist);
  const [items, setItems] = useState(initialSetlist.items);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<SetlistItemWithSongOwner | null>(
    null
  );
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [name, setName] = useState(initialSetlist.name);
  const [description, setDescription] = useState(
    initialSetlist.description || ""
  );
  const [concertDate, setConcertDate] = useState(
    initialSetlist.concert_date || ""
  );
  const [venue, setVenue] = useState(initialSetlist.venue || "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [launchingJam, setLaunchingJam] = useState(false);

  // Sync with server data
  useEffect(() => {
    setSetlist(initialSetlist);
    setItems(initialSetlist.items);
    setName(initialSetlist.name);
    setDescription(initialSetlist.description || "");
    setConcertDate(initialSetlist.concert_date || "");
    setVenue(initialSetlist.venue || "");
  }, [initialSetlist]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Calculate total duration
  const totalDuration = items.reduce(
    (acc, item) =>
      acc + (item.duration_seconds || 0) + (item.transition_seconds || 0),
    0
  );
  const songCount = items.filter((i) => i.item_type === "song").length;

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);

      // Optimistic update
      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);

      // Server update
      await reorderSetlistItems(setlist.id, active.id as string, newIndex + 1);
      router.refresh();
    }
  };

  const handleSaveHeader = async () => {
    setSaving(true);
    await updateSetlist(setlist.id, {
      name: name.trim(),
      description: description.trim() || undefined,
      concert_date: concertDate || undefined,
      venue: venue.trim() || undefined,
    });
    setSaving(false);
    setIsEditingHeader(false);
    router.refresh();
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Supprimer cet element ?")) return;

    // Optimistic update
    setItems(items.filter((i) => i.id !== itemId));

    // Server update
    await deleteSetlistItem(itemId);
    router.refresh();
  };

  const handleDeleteSetlist = async () => {
    await deleteSetlist(setlist.id);
    router.push("/commu/groupes");
  };

  const handleDuplicate = async () => {
    const result = await duplicateSetlist(setlist.id);
    if (result.success && result.setlist) {
      router.push(`/setlists/${result.setlist.id}`);
    }
  };

  const handleRefresh = () => {
    router.refresh();
  };

  const handleLaunchJam = async () => {
    setLaunchingJam(true);
    // Band jam or personal jam
    const result = await createJamSession(
      setlist.band_id || undefined,
      setlist.id
    );
    if (result.success && result.session) {
      router.push(`/jam/${result.session.id}`);
    } else {
      alert(result.error || "Erreur lors du lancement de la Jam");
      setLaunchingJam(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => router.push("/commu/groupes")}
        className="-ml-1 mb-3 inline-flex min-h-[36px] items-center gap-1 rounded-lg px-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <Icon name="chevron_left" className="h-4 w-4" strokeWidth={2.25} />
        Groupes et setlists
      </button>

      {/* Header */}
      <div className="mb-8 max-w-3xl">
        {isEditingHeader ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Nom</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-lg font-bold focus:border-primary"
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Date du concert
                </label>
                <input
                  type="date"
                  value={concertDate}
                  onChange={(e) => setConcertDate(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Lieu</label>
                <input
                  type="text"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="Ex: Le Bataclan"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditingHeader(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveHeader}
                disabled={saving || !name.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Sauvegarde..." : "Sauvegarder"}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {setlist.band && (
                <span className="rounded border border-border px-1.5 py-0.5 font-display text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
                  {setlist.band.name}
                </span>
              )}
            </div>
            <h1 className="mt-1 text-balance font-display text-[44px] font-extrabold uppercase leading-[0.88] sm:text-6xl">
              {setlist.name}
            </h1>
            {setlist.description && (
              <p className="mt-2 font-serif text-[15px] italic text-muted-foreground">{setlist.description}</p>
            )}

            {/* Les chiffres du set, style Atelier */}
            <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-border py-3 sm:grid-cols-4">
              <SetStat label="morceaux" value={String(songCount)} />
              <SetStat label="durée" value={formatDuration(totalDuration)} />
              {setlist.concert_date && <SetStat label="concert" value={formatDate(setlist.concert_date)} small />}
              {setlist.venue && <SetStat label="lieu" value={setlist.venue} small />}
            </dl>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {(!setlist.band_id || userPlan === "band") && (
                <button
                  onClick={handleLaunchJam}
                  disabled={launchingJam}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full bg-primary px-4 text-[13px] font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  <Icon name="music_note" className="h-4 w-4" />
                  {launchingJam ? "Lancement…" : setlist.band_id ? "Lancer un jam" : "Lancer un jam solo"}
                </button>
              )}
              <button onClick={() => setIsEditingHeader(true)} className={ACTION}>
                <Icon name="edit" className="h-4 w-4" />
                Modifier
              </button>
              <SetlistPDFExport setlist={setlist} />
              <button onClick={handleDuplicate} className={ACTION}>
                <Icon name="layers" className="h-4 w-4" />
                Dupliquer
              </button>
              {confirmDelete ? (
                <span className="flex items-center gap-1.5">
                  <button
                    onClick={handleDeleteSetlist}
                    className="inline-flex min-h-[38px] items-center rounded-full bg-destructive px-3.5 text-[13px] font-semibold text-destructive-foreground hover:opacity-90"
                  >
                    Confirmer la suppression
                  </button>
                  <button onClick={() => setConfirmDelete(false)} className={ACTION}>
                    Annuler
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-border px-3.5 text-[13px] font-semibold text-destructive transition-colors hover:bg-destructive/10"
                >
                  <Icon name="delete" className="h-4 w-4" />
                  Supprimer
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Programme */}
      <div className="mb-6">
        <div className="mb-1 flex items-baseline justify-between border-b border-border pb-2">
          <h2 className="font-display text-[13px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
            Programme
          </h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-foreground hover:underline"
          >
            <Icon name="add" className="h-3.5 w-3.5" strokeWidth={2} />
            Ajouter
          </button>
        </div>

        {items.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="max-w-3xl">
                {items.map((item, index) => (
                  <SetlistItemCard
                    key={item.id}
                    item={item}
                    index={index}
                    onEdit={() => setEditingItem(item)}
                    onDelete={() => handleDeleteItem(item.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="flex flex-col items-start gap-2 py-8">
            <p className="text-muted-foreground">Aucun morceau dans cette setlist.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:bg-accent"
            >
              <Icon name="add" className="h-4 w-4" />
              Ajouter ton premier morceau
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddItemModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleRefresh}
        setlistId={setlist.id}
        position={items.length + 1}
        songSources={songSources}
      />

      <EditItemModal
        isOpen={editingItem !== null}
        onClose={() => setEditingItem(null)}
        onSuccess={handleRefresh}
        item={editingItem}
        userPlan={userPlan}
      />
    </div>
  );
}
