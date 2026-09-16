"use client";

import { useState, useMemo, useCallback } from "react";
import type {
  GearItem,
  GearType,
  GearCondition,
  GearSetupWithItems,
  GearWishlistItem,
  GearPriority,
  UserPlan,
} from "@/types";
import {
  GEAR_TYPE_LABELS,
  GEAR_CONDITION_LABELS,
  GEAR_CONDITION_COLORS,
  GEAR_PRIORITY_LABELS,
  GEAR_PRIORITY_COLORS,
} from "@/types";
import {
  getGearItems,
  createGearItem,
  updateGearItem,
  deleteGearItem,
  getGearSetups,
  createGearSetup,
  updateGearSetup,
  deleteGearSetup,
  addGearToSetup,
  removeGearFromSetup,
  getGearWishlist,
  addToGearWishlist,
  removeFromGearWishlist,
} from "@/lib/actions/gear";
import { GearCard } from "@/components/gear/gear-card";
import { AddGearModal } from "@/components/gear/add-gear-modal";
import { GearDetailModal } from "@/components/gear/gear-detail-modal";
import { GearSetupCard } from "@/components/gear/gear-setup-card";
import { GearWishlistCard } from "@/components/gear/gear-wishlist-card";
import { ProUpsell } from "@/components/subscription/pro-upsell";

interface GearViewProps {
  initialGearItems: GearItem[];
  initialGearSetups: GearSetupWithItems[];
  initialWishlistItems: GearWishlistItem[];
  userPlan: UserPlan;
  /** Materiel a ouvrir a l'arrivee — lien profond de la recherche globale. */
  initialGearId?: string;
}

const GEAR_TYPES: { value: GearType | "all"; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "guitar", label: "Guitare" },
  { value: "bass", label: "Basse" },
  { value: "amp", label: "Ampli" },
  { value: "effect", label: "Effet" },
  { value: "accessory", label: "Accessoire" },
  { value: "recording", label: "Enregistrement" },
  { value: "other", label: "Autre" },
];

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "date_desc", label: "Plus recent" },
  { value: "date_asc", label: "Plus ancien" },
  { value: "brand_asc", label: "Marque (A-Z)" },
  { value: "type", label: "Type" },
];

const CONDITION_OPTIONS: { value: GearCondition | "all"; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "mint", label: "Neuf" },
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Bon" },
  { value: "fair", label: "Correct" },
  { value: "poor", label: "Mauvais" },
];

type MainTab = "gear" | "setups" | "wishlist";
type SortBy = "date_desc" | "date_asc" | "brand_asc" | "type";

export function GearView({
  initialGearItems,
  initialGearSetups,
  initialWishlistItems,
  userPlan,
  initialGearId,
}: GearViewProps) {
  // --- Tab state ---
  const [mainTab, setMainTab] = useState<MainTab>("gear");

  // --- Data state ---
  const [gearItems, setGearItems] = useState<GearItem[]>(initialGearItems);
  const [gearSetups, setGearSetups] = useState<GearSetupWithItems[]>(initialGearSetups);
  const [wishlistItems, setWishlistItems] = useState<GearWishlistItem[]>(initialWishlistItems);

  // --- Filter / search state (Mon Matos) ---
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<GearType | "all">("all");
  const [conditionFilter, setConditionFilter] = useState<GearCondition | "all">("all");
  const [activeOnlyFilter, setActiveOnlyFilter] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("date_desc");
  const [showFilters, setShowFilters] = useState(false);

  // --- Modal state ---
  const [showAddModal, setShowAddModal] = useState(false);
  // Arrivee depuis la recherche globale : la fiche du materiel s'ouvre des
  // le premier rendu.
  const [selectedGear, setSelectedGear] = useState<GearItem | null>(
    () => initialGearItems.find((item) => item.id === initialGearId) ?? null
  );

  // --- Setup creation state ---
  const [showSetupForm, setShowSetupForm] = useState(false);
  const [setupName, setSetupName] = useState("");
  const [setupDescription, setSetupDescription] = useState("");
  const [isCreatingSetup, setIsCreatingSetup] = useState(false);

  // --- Wishlist addition state ---
  const [showWishlistForm, setShowWishlistForm] = useState(false);
  const [wishlistBrand, setWishlistBrand] = useState("");
  const [wishlistModel, setWishlistModel] = useState("");
  const [wishlistType, setWishlistType] = useState<GearType>("guitar");
  const [wishlistPriority, setWishlistPriority] = useState<GearPriority>("medium");
  const [wishlistEstimatedPrice, setWishlistEstimatedPrice] = useState("");
  const [wishlistNotes, setWishlistNotes] = useState("");
  const [wishlistUrl, setWishlistUrl] = useState("");
  const [isAddingWishlist, setIsAddingWishlist] = useState(false);

  // --- Loading state ---
  const [isRefreshing, setIsRefreshing] = useState(false);

  // --- Plan limits ---
  const isFree = userPlan === "free";
  const GEAR_LIMIT_FREE = 10;
  const SETUP_LIMIT_FREE = 2;
  const WISHLIST_LIMIT_FREE = 10;
  const canAddGear = !isFree || gearItems.length < GEAR_LIMIT_FREE;
  const canAddSetup = !isFree || gearSetups.length < SETUP_LIMIT_FREE;
  const canAddWishlist = !isFree || wishlistItems.length < WISHLIST_LIMIT_FREE;

  // --- Refresh functions ---
  const refreshGear = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const items = await getGearItems();
      setGearItems(items);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const refreshSetups = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const setups = await getGearSetups();
      setGearSetups(setups);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const refreshWishlist = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const items = await getGearWishlist();
      setWishlistItems(items);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // --- Filtering and sorting (Mon Matos) ---
  const filteredGearItems = useMemo(() => {
    let items = [...gearItems];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.brand?.toLowerCase().includes(q) ||
          item.model?.toLowerCase().includes(q)
      );
    }

    // Type filter
    if (typeFilter !== "all") {
      items = items.filter((item) => item.type === typeFilter);
    }

    // Condition filter
    if (conditionFilter !== "all") {
      items = items.filter((item) => item.condition === conditionFilter);
    }

    // Active only filter
    if (activeOnlyFilter) {
      items = items.filter((item) => item.is_active);
    }

    // Sort
    switch (sortBy) {
      case "date_desc":
        items.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
      case "date_asc":
        items.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        break;
      case "brand_asc":
        items.sort((a, b) =>
          (a.brand || "").localeCompare(b.brand || "", "fr")
        );
        break;
      case "type":
        items.sort((a, b) =>
          (a.type || "").localeCompare(b.type || "", "fr")
        );
        break;
    }

    return items;
  }, [gearItems, searchQuery, typeFilter, conditionFilter, activeOnlyFilter, sortBy]);

  // --- Handlers ---
  const handleGearAdded = useCallback(async () => {
    setShowAddModal(false);
    await refreshGear();
  }, [refreshGear]);

  const handleGearUpdated = useCallback(async () => {
    setSelectedGear(null);
    await refreshGear();
  }, [refreshGear]);

  const handleGearDeleted = useCallback(async () => {
    setSelectedGear(null);
    await refreshGear();
  }, [refreshGear]);

  const handleCreateSetup = useCallback(async () => {
    if (!setupName.trim()) return;
    setIsCreatingSetup(true);
    try {
      await createGearSetup({
        name: setupName.trim(),
        description: setupDescription.trim() || undefined,
      });
      setSetupName("");
      setSetupDescription("");
      setShowSetupForm(false);
      await refreshSetups();
    } finally {
      setIsCreatingSetup(false);
    }
  }, [setupName, setupDescription, refreshSetups]);

  const handleDeleteSetup = useCallback(
    async (setupId: string) => {
      await deleteGearSetup(setupId);
      await refreshSetups();
    },
    [refreshSetups]
  );

  const handleAddWishlistItem = useCallback(async () => {
    if (!wishlistBrand.trim() || !wishlistModel.trim()) return;
    setIsAddingWishlist(true);
    try {
      await addToGearWishlist({
        brand: wishlistBrand.trim(),
        model: wishlistModel.trim(),
        type: wishlistType,
        priority: wishlistPriority,
        estimated_price: wishlistEstimatedPrice
          ? parseFloat(wishlistEstimatedPrice)
          : undefined,
        notes: wishlistNotes.trim() || undefined,
        url: wishlistUrl.trim() || undefined,
      });
      setWishlistBrand("");
      setWishlistModel("");
      setWishlistType("guitar");
      setWishlistPriority("medium");
      setWishlistEstimatedPrice("");
      setWishlistNotes("");
      setWishlistUrl("");
      setShowWishlistForm(false);
      await refreshWishlist();
    } finally {
      setIsAddingWishlist(false);
    }
  }, [
    wishlistBrand,
    wishlistModel,
    wishlistType,
    wishlistPriority,
    wishlistEstimatedPrice,
    wishlistNotes,
    wishlistUrl,
    refreshWishlist,
  ]);

  const handleRemoveWishlistItem = useCallback(
    async (itemId: string) => {
      await removeFromGearWishlist(itemId);
      await refreshWishlist();
    },
    [refreshWishlist]
  );

  // --- Tab config ---
  const tabs: { key: MainTab; label: string; count: number; icon: React.ReactNode }[] = [
    {
      key: "gear",
      label: "Mon Matos",
      count: gearItems.length,
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11.5 2l1 2.5L14 6l-1.5 1.5L14 9l-2 1-1 3.5c-.3 1-.8 2-1.8 2.8-1.5 1.2-2.5 2.2-2.5 3.7a3 3 0 006 0c0-1-.3-1.7-.7-2.3" />
          <circle cx="10.5" cy="18" r="1" />
          <path d="M14 6l3-3" />
          <path d="M15.5 2.5l2 2" />
        </svg>
      ),
    },
    {
      key: "setups",
      label: "Setups",
      count: gearSetups.length,
      icon: <span className="material-symbols-outlined text-base">settings</span>,
    },
    {
      key: "wishlist",
      label: "Wishlist",
      count: wishlistItems.length,
      icon: <span className="material-symbols-outlined text-base">favorite</span>,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold">Mon Matos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerez votre equipement, vos setups et votre wishlist
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMainTab(tab.key)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
              mainTab === tab.key
                ? "bg-primary text-primary-foreground"
                : "bg-accent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                mainTab === tab.key
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ========== Mon Matos Tab ========== */}
      {mainTab === "gear" && (
        <div className="space-y-4">
          {/* Search + Filter bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <span className="material-symbols-outlined text-base absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">search</span>
              <input
                type="text"
                placeholder="Rechercher par marque ou modele..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-border/50 bg-card py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 rounded-xl border border-border/50 px-3 py-2.5 text-sm font-medium transition-colors ${
                  showFilters || typeFilter !== "all" || conditionFilter !== "all" || activeOnlyFilter
                    ? "border-primary bg-primary/10 text-primary"
                    : "bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="material-symbols-outlined text-base">tune</span>
                <span className="hidden sm:inline">Filtres</span>
              </button>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="appearance-none rounded-xl border border-border/50 bg-card py-2.5 pl-3 pr-8 text-sm text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {canAddGear ? (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <span className="material-symbols-outlined text-base">add</span>
                  <span className="hidden sm:inline">Ajouter</span>
                </button>
              ) : (
                <ProUpsell
                  feature="Materiel illimite"
                  description="Passez a Pro pour ajouter plus d'equipements."
                  compact
                />
              )}
            </div>
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className="rounded-xl border border-border/50 bg-card p-4 space-y-4">
              <div className="flex flex-wrap gap-4">
                {/* Type filter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Type
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {GEAR_TYPES.map((type) => (
                      <button
                        key={type.value}
                        onClick={() => setTypeFilter(type.value)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          typeFilter === type.value
                            ? "bg-primary text-primary-foreground"
                            : "bg-accent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Condition filter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Etat
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {CONDITION_OPTIONS.map((cond) => (
                      <button
                        key={cond.value}
                        onClick={() => setConditionFilter(cond.value)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          conditionFilter === cond.value
                            ? "bg-primary text-primary-foreground"
                            : "bg-accent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {cond.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Active only toggle */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Statut
                  </label>
                  <button
                    onClick={() => setActiveOnlyFilter(!activeOnlyFilter)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      activeOnlyFilter
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    En utilisation
                  </button>
                </div>
              </div>

              {/* Clear filters */}
              {(typeFilter !== "all" || conditionFilter !== "all" || activeOnlyFilter) && (
                <button
                  onClick={() => {
                    setTypeFilter("all");
                    setConditionFilter("all");
                    setActiveOnlyFilter(false);
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  Reinitialiser les filtres
                </button>
              )}
            </div>
          )}

          {/* Gear items list */}
          {filteredGearItems.length > 0 ? (
            <div className="space-y-3">
              {filteredGearItems.map((item) => (
                <GearCard
                  key={item.id}
                  gear={item}
                  onClick={() => setSelectedGear(item)}
                />
              ))}
            </div>
          ) : gearItems.length > 0 ? (
            // Has items but filters hide them
            <div className="flex flex-col items-center justify-center rounded-xl border border-border/50 bg-card py-16 text-center">
              <span className="material-symbols-outlined text-5xl text-muted-foreground/40 mb-4">search</span>
              <h3 className="text-lg font-semibold">Aucun resultat</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Aucun equipement ne correspond a vos criteres de recherche.
                Essayez de modifier vos filtres.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setTypeFilter("all");
                  setConditionFilter("all");
                  setActiveOnlyFilter(false);
                }}
                className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Reinitialiser les filtres
              </button>
            </div>
          ) : (
            // Empty state
            <div className="flex flex-col items-center justify-center rounded-xl border border-border/50 bg-card py-16 text-center">
              <svg className="mb-4 h-12 w-12 text-muted-foreground/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11.5 2l1 2.5L14 6l-1.5 1.5L14 9l-2 1-1 3.5c-.3 1-.8 2-1.8 2.8-1.5 1.2-2.5 2.2-2.5 3.7a3 3 0 006 0c0-1-.3-1.7-.7-2.3" />
                <circle cx="10.5" cy="18" r="1" />
                <path d="M14 6l3-3" />
                <path d="M15.5 2.5l2 2" />
              </svg>
              <h3 className="text-lg font-semibold">Aucun equipement</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Commencez par ajouter vos guitares, amplis, pedales et autres
                equipements pour les retrouver facilement.
              </p>
              {canAddGear ? (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-4 flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <span className="material-symbols-outlined text-base">add</span>
                  Ajouter mon premier equipement
                </button>
              ) : (
                <div className="mt-4">
                  <ProUpsell
                    feature="Materiel illimite"
                    description="Passez a Pro pour ajouter plus d'equipements."
                  />
                </div>
              )}
            </div>
          )}

          {/* Plan limit info for free users */}
          {isFree && gearItems.length > 0 && (
            <p className="text-center text-xs text-muted-foreground">
              {gearItems.length}/{GEAR_LIMIT_FREE} equipements utilises sur le
              plan gratuit
            </p>
          )}
        </div>
      )}

      {/* ========== Setups Tab ========== */}
      {mainTab === "setups" && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Organisez vos equipements en setups pour retrouver vos
              configurations preferees.
            </p>
            {canAddSetup ? (
              <button
                onClick={() => setShowSetupForm(!showSetupForm)}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <span className="material-symbols-outlined text-base">add</span>
                <span className="hidden sm:inline">Creer un setup</span>
              </button>
            ) : (
              <ProUpsell
                feature="Setups illimites"
                description="Passez a Pro pour creer plus de setups."
                compact
              />
            )}
          </div>

          {/* Inline setup creation form */}
          {showSetupForm && (
            <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
              <h3 className="text-sm font-semibold">Nouveau setup</h3>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Nom du setup (ex: Live Rock, Studio Acoustique...)"
                  value={setupName}
                  onChange={(e) => setSetupName(e.target.value)}
                  className="w-full rounded-xl border border-border/50 bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <textarea
                  placeholder="Description (optionnel)"
                  value={setupDescription}
                  onChange={(e) => setSetupDescription(e.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-xl border border-border/50 bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setShowSetupForm(false);
                    setSetupName("");
                    setSetupDescription("");
                  }}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateSetup}
                  disabled={!setupName.trim() || isCreatingSetup}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isCreatingSetup ? "Creation..." : "Creer"}
                </button>
              </div>
            </div>
          )}

          {/* Setups list */}
          {gearSetups.length > 0 ? (
            <div className="space-y-3">
              {gearSetups.map((setup) => (
                <GearSetupCard
                  key={setup.id}
                  setup={setup}
                  onEdit={async () => {
                    // Edit is handled via the card's own UI;
                    // trigger update then refresh
                    await refreshSetups();
                  }}
                  onDelete={() => handleDeleteSetup(setup.id)}
                  onRemoveItem={async (gearId) => {
                    await removeGearFromSetup(setup.id, gearId);
                    await refreshSetups();
                  }}
                />
              ))}
            </div>
          ) : (
            // Empty state
            <div className="flex flex-col items-center justify-center rounded-xl border border-border/50 bg-card py-16 text-center">
              <span className="material-symbols-outlined text-5xl text-muted-foreground/40 mb-4">layers</span>
              <h3 className="text-lg font-semibold">Aucun setup</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Creez des setups pour regrouper vos equipements par
                configuration (Live, Studio, Repet...).
              </p>
              {canAddSetup ? (
                <button
                  onClick={() => setShowSetupForm(true)}
                  className="mt-4 flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <span className="material-symbols-outlined text-base">add</span>
                  Creer mon premier setup
                </button>
              ) : (
                <div className="mt-4">
                  <ProUpsell
                    feature="Setups illimites"
                    description="Passez a Pro pour creer plus de setups."
                  />
                </div>
              )}
            </div>
          )}

          {/* Plan limit info */}
          {isFree && gearSetups.length > 0 && (
            <p className="text-center text-xs text-muted-foreground">
              {gearSetups.length}/{SETUP_LIMIT_FREE} setups utilises sur le plan
              gratuit
            </p>
          )}
        </div>
      )}

      {/* ========== Wishlist Tab ========== */}
      {mainTab === "wishlist" && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Gardez une trace des equipements que vous aimeriez acquerir.
            </p>
            {canAddWishlist ? (
              <button
                onClick={() => setShowWishlistForm(!showWishlistForm)}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <span className="material-symbols-outlined text-base">add</span>
                <span className="hidden sm:inline">Ajouter</span>
              </button>
            ) : (
              <ProUpsell
                feature="Wishlist illimitee"
                description="Passez a Pro pour ajouter plus de souhaits."
                compact
              />
            )}
          </div>

          {/* Inline wishlist form */}
          {showWishlistForm && (
            <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
              <h3 className="text-sm font-semibold">
                Ajouter a la wishlist
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  placeholder="Marque *"
                  value={wishlistBrand}
                  onChange={(e) => setWishlistBrand(e.target.value)}
                  className="rounded-xl border border-border/50 bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <input
                  type="text"
                  placeholder="Modele *"
                  value={wishlistModel}
                  onChange={(e) => setWishlistModel(e.target.value)}
                  className="rounded-xl border border-border/50 bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <select
                  value={wishlistType}
                  onChange={(e) => setWishlistType(e.target.value as GearType)}
                  className="w-full appearance-none rounded-xl border border-border/50 bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {GEAR_TYPES.filter((t) => t.value !== "all").map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <select
                  value={wishlistPriority}
                  onChange={(e) =>
                    setWishlistPriority(e.target.value as GearPriority)
                  }
                  className="w-full appearance-none rounded-xl border border-border/50 bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="low">Basse priorite</option>
                  <option value="medium">Moyenne priorite</option>
                  <option value="high">Haute priorite</option>
                </select>
                <input
                  type="number"
                  placeholder="Prix estime (EUR)"
                  value={wishlistEstimatedPrice}
                  onChange={(e) => setWishlistEstimatedPrice(e.target.value)}
                  className="rounded-xl border border-border/50 bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <input
                  type="url"
                  placeholder="Lien (optionnel)"
                  value={wishlistUrl}
                  onChange={(e) => setWishlistUrl(e.target.value)}
                  className="rounded-xl border border-border/50 bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <textarea
                placeholder="Notes (optionnel)"
                value={wishlistNotes}
                onChange={(e) => setWishlistNotes(e.target.value)}
                rows={2}
                className="w-full resize-none rounded-xl border border-border/50 bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setShowWishlistForm(false);
                    setWishlistBrand("");
                    setWishlistModel("");
                    setWishlistType("guitar");
                    setWishlistPriority("medium");
                    setWishlistEstimatedPrice("");
                    setWishlistNotes("");
                    setWishlistUrl("");
                  }}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddWishlistItem}
                  disabled={
                    !wishlistBrand.trim() ||
                    !wishlistModel.trim() ||
                    isAddingWishlist
                  }
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isAddingWishlist ? "Ajout..." : "Ajouter"}
                </button>
              </div>
            </div>
          )}

          {/* Wishlist items */}
          {wishlistItems.length > 0 ? (
            <div className="space-y-3">
              {wishlistItems.map((item) => (
                <GearWishlistCard
                  key={item.id}
                  item={item}
                  onRemove={() => handleRemoveWishlistItem(item.id)}
                />
              ))}
            </div>
          ) : (
            // Empty state
            <div className="flex flex-col items-center justify-center rounded-xl border border-border/50 bg-card py-16 text-center">
              <span className="material-symbols-outlined text-5xl text-muted-foreground/40 mb-4">shopping_bag</span>
              <h3 className="text-lg font-semibold">Wishlist vide</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Ajoutez les equipements que vous souhaitez acquerir pour garder
                une trace de vos envies.
              </p>
              {canAddWishlist ? (
                <button
                  onClick={() => setShowWishlistForm(true)}
                  className="mt-4 flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <span className="material-symbols-outlined text-base">add</span>
                  Ajouter mon premier souhait
                </button>
              ) : (
                <div className="mt-4">
                  <ProUpsell
                    feature="Wishlist illimitee"
                    description="Passez a Pro pour ajouter plus de souhaits."
                  />
                </div>
              )}
            </div>
          )}

          {/* Plan limit info */}
          {isFree && wishlistItems.length > 0 && (
            <p className="text-center text-xs text-muted-foreground">
              {wishlistItems.length}/{WISHLIST_LIMIT_FREE} souhaits utilises sur
              le plan gratuit
            </p>
          )}
        </div>
      )}

      {/* ========== Modals ========== */}
      <AddGearModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSaved={handleGearAdded}
        userPlan={userPlan}
      />

      {selectedGear && (
        <GearDetailModal
          gear={selectedGear}
          isOpen={!!selectedGear}
          onClose={() => setSelectedGear(null)}
          onUpdated={handleGearUpdated}
          onDeleted={handleGearDeleted}
          userPlan={userPlan}
        />
      )}
    </div>
  );
}
