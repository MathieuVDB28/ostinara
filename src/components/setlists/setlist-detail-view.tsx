"use client";

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
import { SetlistPDFExport } from "./setlist-pdf-export";
import {
  updateSetlist,
  deleteSetlist,
  deleteSetlistItem,
  reorderSetlistItems,
  duplicateSetlist,
} from "@/lib/actions/setlists";
import type {
  SetlistWithDetails,
  SetlistItemWithSongOwner,
  Profile,
  Song,
} from "@/types";

interface SetlistDetailViewProps {
  setlist: SetlistWithDetails;
  songSources: { member: Profile | null; songs: Song[] }[];
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

export function SetlistDetailView({
  setlist: initialSetlist,
  songSources,
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
    router.push("/setlists");
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

  return (
    <div>
      {/* Back button */}
      <button
        onClick={() => router.push("/setlists")}
        className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
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
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Retour aux setlists
      </button>

      {/* Header */}
      <div className="mb-8 rounded-2xl border border-border bg-card p-6">
        {isEditingHeader ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Nom</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-lg font-bold focus:border-primary focus:outline-none"
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
                className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
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
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Lieu</label>
                <input
                  type="text"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="Ex: Le Bataclan"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold sm:text-3xl">{setlist.name}</h1>
                {setlist.band && (
                  <span className="rounded-full bg-primary/20 px-3 py-1 text-sm font-medium text-primary">
                    {setlist.band.name}
                  </span>
                )}
              </div>
              {setlist.description && (
                <p className="mt-2 text-muted-foreground">
                  {setlist.description}
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {setlist.concert_date && (
                  <div className="flex items-center gap-1.5">
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
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span>{formatDate(setlist.concert_date)}</span>
                  </div>
                )}
                {setlist.venue && (
                  <div className="flex items-center gap-1.5">
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
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span>{setlist.venue}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
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
                  <span>
                    {songCount} morceau{songCount > 1 ? "x" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
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
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>{formatDuration(totalDuration)}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setIsEditingHeader(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
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
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
                Modifier
              </button>
              <SetlistPDFExport setlist={setlist} />
              <button
                onClick={handleDuplicate}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
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
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Dupliquer
              </button>
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDeleteSetlist}
                    className="rounded-lg bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground transition-all hover:opacity-90"
                  >
                    Confirmer
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
                  >
                    Annuler
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/50 px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Supprimer
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Items list */}
      <div className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Programme</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
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
              <div className="space-y-2">
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
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <svg
                className="h-6 w-6 text-muted-foreground"
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
            <p className="text-muted-foreground">Aucun morceau dans cette setlist</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-2 text-sm text-primary hover:underline"
            >
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
      />
    </div>
  );
}
